from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import time
import json
import logging

from app.core.database import get_db, engine
from app import models
from app.core import lead_deduplication
from app.utils import webhook_security
from app.api import webhook_handlers

router = APIRouter()
logger = logging.getLogger(__name__)

def mask_pii_payload(obj: Any) -> Any:
    """Recursively mask sensitive PII fields (phone, email, secret keys) for logging."""
    if isinstance(obj, dict):
        masked = {}
        for k, v in obj.items():
            k_lower = str(k).lower()
            if any(term in k_lower for term in ["pass", "token", "secret", "auth", "key"]):
                masked[k] = "[REDACTED]"
            elif any(term in k_lower for term in ["phone", "mobile", "contact"]) and isinstance(v, str):
                digits = "".join(filter(str.isdigit, v))
                if len(digits) >= 10:
                    masked[k] = digits[:2] + "****" + digits[-4:]
                else:
                    masked[k] = "***"
            elif any(term in k_lower for term in ["email", "mail"]) and isinstance(v, str) and "@" in v:
                parts = v.split("@", 1)
                masked[k] = (parts[0][:2] + "***@" + parts[1]) if len(parts[0]) > 2 else "***@" + parts[1]
            else:
                masked[k] = mask_pii_payload(v)
        return masked
    elif isinstance(obj, list):
        return [mask_pii_payload(item) for item in obj]
    return obj

def mask_headers(headers: dict) -> dict:
    """Mask sensitive authentication or secret headers before recording in logs."""
    masked = {}
    for k, v in headers.items():
        if str(k).lower() in ["authorization", "cookie", "x-webhook-secret", "x-secret-token", "x-hub-signature-256"]:
            masked[k] = "[REDACTED]"
        else:
            masked[k] = v
    return masked

@router.post("/{source_type}")
async def process_webhook(
    source_type: str,
    request: Request,
    background_tasks: BackgroundTasks,
    integration_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db)
):
    """
    Unified webhook receiver. 
    Routes to source-specific handlers and processing leads.
    """
    start_time = time.time()
    
    # 1. Lookup Integration
    integration = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.source_type == source_type
    ).first()
    
    if not integration:
        return {"success": False, "detail": "Integration not found"}
        
    if not integration.is_active:
        return {"success": False, "detail": "Integration disabled"}
    
    # 2. Rate Limiting
    if not webhook_security.check_rate_limit(str(integration_id)):
        return {"success": False, "detail": "Rate limit exceeded"}

    # 3. Read Body
    body_bytes = await request.body()
    try:
        body = await request.json()
    except Exception:
        form_data = await request.form()
        body = dict(form_data) if form_data else {}

    # 4. Signature & Webhook Secret Token Verification
    if integration.webhook_secret:
        if source_type == "meta_ads":
            signature = request.headers.get("X-Hub-Signature-256")
            if not webhook_security.verify_meta_signature(body_bytes, signature, integration.webhook_secret):
                log_webhook(db, integration, request, mask_pii_payload(body), 401, error="Invalid Meta signature")
                return {"success": False, "detail": "Invalid signature"}
        else:
            client_token = (
                request.headers.get("X-Webhook-Secret") or
                request.headers.get("X-Secret-Token") or
                request.query_params.get("secret_token") or
                request.headers.get("X-Goog-Signature")
            )
            if not client_token or client_token != integration.webhook_secret:
                log_webhook(db, integration, request, mask_pii_payload(body), 401, error="Invalid or missing webhook secret token")
                return {"success": False, "detail": "Invalid or missing webhook secret token"}

    # 5. Route to Handler
    handler = getattr(webhook_handlers, source_type, None)
    if not handler:
        return {"success": False, "detail": f"No handler for {source_type}"}
    
    # Create WebhookLog with PII masking
    log_entry = models.WebhookLog(
        id=uuid.uuid4(),
        integration_id=integration_id,
        tenant_id=integration.tenant_id,
        source_type=source_type,
        request_method=request.method,
        request_headers=mask_headers(dict(request.headers)),
        request_body=mask_pii_payload(body),
        request_ip=request.client.host if request.client else None
    )

    # 6. Parse Lead Data
    try:
        normalized_lead = handler.parse_webhook(body, integration.config or {})
    except Exception as e:
        log_webhook(db, integration, request, mask_pii_payload(body), 400, error=f"Parsing error: {str(e)}")
        return {"success": False, "detail": str(e)}

    # 7. Get Tenant Schema
    from app.auth.models import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == integration.tenant_id).first()
    if not tenant:
        log_webhook(db, integration, request, mask_pii_payload(body), 404, error="Tenant not found")
        return {"success": False, "detail": "Tenant not found"}

    # 8. Switch to Tenant Session
    from sqlalchemy import text
    from app.core.database import SessionLocal
    tenant_engine = engine.execution_options(schema_translate_map={None: tenant.schema_name})
    tenant_db = SessionLocal(bind=tenant_engine)
    
    try:
        tenant_db.execute(text(f'SET search_path TO "{tenant.schema_name}", public'))
        
        # 9. Process Lead (Create or Merge)
        existing_lead = lead_deduplication.find_duplicate(
            phone=normalized_lead["phone"],
            project_id=integration.project_id,
            tenant_id=integration.tenant_id,
            db=tenant_db
        )
        
        target_lead_id = None
        is_duplicate = False
        
        if existing_lead:
            # Merge
            lead_deduplication.merge_lead_data(
                existing_lead=existing_lead,
                new_data=normalized_lead,
                source_channel=normalized_lead.get("source_channel", source_type),
                db=tenant_db
            )
            target_lead_id = existing_lead.id
            is_duplicate = True
        else:
            # Create New
            from app.models.lead import Lead
            new_lead = Lead(
                tenant_id=integration.tenant_id,
                project_id=integration.project_id,
                name=normalized_lead["name"],
                phone=normalized_lead["phone"],
                email=normalized_lead.get("email"),
                source_group=normalized_lead.get("source_group", "Other"),
                source_channel=normalized_lead.get("source_channel", source_type),
                source_sub_channel=normalized_lead.get("source_sub_channel"),
                custom_fields=normalized_lead.get("custom_fields", {}),
                created_by=integration.created_by
            )
            tenant_db.add(new_lead)
            tenant_db.commit()
            tenant_db.refresh(new_lead)
            target_lead_id = new_lead.id
            
            # Update integration stats in public DB
            integration.total_leads_created += 1

        # 10. Update Integration Stats (Public)
        integration.total_webhooks_received += 1
        integration.last_webhook_at = datetime.utcnow()
        db.commit()

        # 11. Finalize Log (Public)
        log_entry.response_status = 200
        log_entry.lead_created = not is_duplicate
        log_entry.lead_id = target_lead_id
        log_entry.is_duplicate = is_duplicate
        
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        log_entry.response_status = 500
        log_entry.error_message = str(e)
        db.add(log_entry)
        db.commit()
        return {"success": False, "error": str(e)}
    finally:
        tenant_db.close()

    # Calculate processing time
    log_entry.processing_time_ms = int((time.time() - start_time) * 1000)
    db.add(log_entry)
    db.commit()

    # 12. Background Task
    background_tasks.add_task(cleanup_logs)

    return {"success": True, "lead_id": str(log_entry.lead_id)}

def log_webhook(db: Session, integration, request, body, status, error=None):
    """Helper to log failed early-exit requests with masked PII"""
    log = models.WebhookLog(
        integration_id=integration.id,
        tenant_id=integration.tenant_id,
        source_type=integration.source_type,
        request_method=request.method,
        request_headers=mask_headers(dict(request.headers)),
        request_body=mask_pii_payload(body),
        response_status=status,
        error_message=error,
        processing_time_ms=0
    )
    db.add(log)
    db.commit()

async def cleanup_logs():
    """Background worker: Deletes webhook logs older than 30 days."""
    try:
        limit_date = datetime.utcnow() - timedelta(days=30)
        from sqlalchemy import text
        with engine.begin() as conn:
             conn.execute(text("DELETE FROM public.webhook_logs WHERE created_at < :limit"), {"limit": limit_date})
    except Exception as e:
        logger.error(f"Failed to cleanup logs: {e}")
