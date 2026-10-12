from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import logging
import json

from app.core.database import get_db, engine, SessionLocal
from app.models.integration import Integration
from app.auth.models import Tenant
from app.models.lead import Lead
from app.api.webhook_handlers import google_ads
from app.core import lead_deduplication

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{client_token}")
async def verify_google_webhook(client_token: str, db: Session = Depends(get_db)):
    """
    Google verification ping. Returns 200 OK.
    Sets verified = true for the integration.
    """
    integration = db.query(Integration).filter(
        Integration.source_type == "google_ads",
        Integration.webhook_secret == client_token
    ).first()

    if not integration:
        logger.warning(f"Verification ping with invalid token: {client_token}")
        # We return 200 anyway because Google doesn't like errors on pings
        return {"status": "ok", "message": "Verification received"}

    # Mark as verified
    config = dict(integration.config or {})
    config["verified"] = True
    config["verified_at"] = datetime.now(timezone.utc).isoformat()
    integration.config = config
    db.commit()

    return {"status": "ok", "message": "Integration verified"}

@router.post("/{client_token}")
async def ingest_google_lead(
    client_token: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Google Ads Lead Form Ingestion.
    Returns 200 OK fast (<2s), processes lead in background.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    # Find integration
    integration = db.query(Integration).filter(
        Integration.source_type == "google_ads",
        Integration.webhook_secret == client_token,
        Integration.is_active == True
    ).first()

    if not integration:
        return {"status": "ok", "message": "Integration not active or token invalid"}

    # Process in background
    background_tasks.add_task(process_google_lead_bg, integration.id, body)

    return {"status": "ok"}

def process_google_lead_bg(integration_id: uuid.UUID, body: dict):
    """
    Background task to process the Google lead.
    """
    db = SessionLocal()
    try:
        # Re-fetch integration in this session
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if not integration:
            return

        # 1. Parse
        try:
            normalized_lead = google_ads.parse_webhook(body, integration.config or {})
        except Exception as e:
            _log_error(db, integration, f"Parsing error: {str(e)}")
            return

        # Skip test leads if requested (optional logic)
        # But here we save them but flag them as is_test
        
        # 2. Get Tenant
        tenant = db.query(Tenant).filter(Tenant.id == integration.tenant_id).first()
        if not tenant:
            _log_error(db, integration, "Tenant not found")
            return

        # 3. Connect to Tenant Schema
        tenant_engine = engine.execution_options(schema_translate_map={None: tenant.schema_name})
        tenant_db = SessionLocal(bind=tenant_engine)
        
        try:
            from sqlalchemy import text
            tenant_db.execute(text(f'SET search_path TO "{tenant.schema_name}", public'))
            
            phone = normalized_lead["phone"]
            project_id = integration.project_id
            
            # Detect duplicate
            existing_lead = lead_deduplication.find_duplicate(
                phone=phone,
                project_id=project_id,
                tenant_id=integration.tenant_id,
                db=tenant_db
            )
            
            if existing_lead and not normalized_lead.get("is_test"):
                # Merge data
                lead_deduplication.merge_lead_data(
                    existing_lead=existing_lead,
                    new_data=normalized_lead,
                    source_channel="Google Ads",
                    db=tenant_db
                )
            else:
                # Create New
                new_lead = Lead(
                    tenant_id=integration.tenant_id,
                    project_id=project_id,
                    name=normalized_lead["name"],
                    phone=phone,
                    email=normalized_lead.get("email"),
                    source_group=normalized_lead.get("source_group"),
                    source_channel=normalized_lead.get("source_channel"),
                    source_sub_channel=normalized_lead.get("source_sub_channel"),
                    utm_source=normalized_lead.get("utm_source"),
                    utm_medium=normalized_lead.get("utm_medium"),
                    utm_campaign=normalized_lead.get("utm_campaign"),
                    utm_term=normalized_lead.get("utm_term"),
                    utm_content=normalized_lead.get("utm_content"),
                    custom_fields=normalized_lead.get("custom_fields", {}),
                )
                tenant_db.add(new_lead)
                tenant_db.commit()
            
            # Update integration stats
            integration.total_leads_created += 1
            integration.last_webhook_at = datetime.now(timezone.utc)
            # Clear previous error
            config = dict(integration.config or {})
            config["last_error"] = None
            config["last_error_at"] = None
            integration.config = config
            db.commit()
            
        except Exception as e:
            tenant_db.rollback()
            _log_error(db, integration, f"Database error: {str(e)}")
        finally:
            tenant_db.close()
            
    except Exception as e:
        logger.error(f"Background processing failed: {str(e)}")
    finally:
        db.close()

def _log_error(db: Session, integration: Integration, error_msg: str):
    """Helper to log last error in integration config"""
    config = dict(integration.config or {})
    config["last_error"] = error_msg
    config["last_error_at"] = datetime.now(timezone.utc).isoformat()
    integration.config = config
    db.commit()
