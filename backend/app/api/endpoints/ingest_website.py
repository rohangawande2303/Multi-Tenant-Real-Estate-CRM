from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import logging
import json

from app.core.database import get_db, engine, SessionLocal
from app.models.integration import Integration
from app.auth.models import Tenant
from app.models.lead import Lead
from app.core import lead_deduplication

router = APIRouter()
logger = logging.getLogger(__name__)

# Basic javascript snippet to capture all forms
JS_SNIPPET_TEMPLATE = """
(function() {
    // Social Pulse Agency - Universal Form Tracking
    var scriptTag = document.currentScript;
    if (!scriptTag) {
        console.warn('SP-CRM: Could not find script tag.');
        return;
    }
    
    var src = scriptTag.src;
    var url = new URL(src);
    var token = url.searchParams.get("token");
    
    if (!token) {
        console.warn('SP-CRM: Tracking token missing from script URL.');
        return;
    }
    
    var backendUrl = url.origin + "/api/v1/ingest/website/" + token;
    
    document.addEventListener("submit", function(e) {
        var form = e.target;
        if (!form || form.tagName !== "FORM") return;
        
        // Try to collect data
        var formData = new FormData(form);
        var data = {};
        
        // Extract basic fields
        for (var pair of formData.entries()) {
            var key = pair[0].toLowerCase();
            var val = pair[1];
            data[key] = val;
        }
        
        // Also capture page URL
        data['page_url'] = window.location.href;
        
        // Fire and forget (don't prevent default, let the form submit normally)
        fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
            mode: 'cors'
        }).catch(function(err) {
            console.warn('SP-CRM Tracking Error:', err);
        });
    });
})();
"""

@router.get("/script.js")
async def get_tracking_script():
    """
    Serves the universal tracking script.
    Usage: <script src="https://api.domain.com/api/v1/ingest/website/script.js?token=CLIENT_TOKEN"></script>
    """
    return PlainTextResponse(content=JS_SNIPPET_TEMPLATE, media_type="application/javascript")


@router.options("/{client_token}")
async def preflight_website_webhook(client_token: str):
    """
    Handle CORS preflight requests for the POST endpoint.
    Browsers send OPTIONS before POST when cross-origin.
    """
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Access-Control-Max-Age": "86400",
    }
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers=headers)


@router.post("/{client_token}")
async def ingest_website_lead(
    client_token: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Website Lead Form Ingestion.
    Receives JSON payload from the JS snippet.
    """
    # Important for CORS on the actual POST request
    headers = {
        "Access-Control-Allow-Origin": "*"
    }
    
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST, 
            content={"status": "error", "message": "Invalid JSON"},
            headers=headers
        )

    # Find integration
    integration = db.query(Integration).filter(
        Integration.source_type == "website",
        Integration.webhook_secret == client_token,
        Integration.is_active == True
    ).first()

    if not integration:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"status": "error", "message": "Integration not active or token invalid"},
            headers=headers
        )

    # Process in background to return quickly
    background_tasks.add_task(process_website_lead_bg, integration.id, body)

    return JSONResponse(content={"status": "ok"}, headers=headers)


def process_website_lead_bg(integration_id: uuid.UUID, body: dict):
    """
    Background task to process the Website lead.
    """
    db = SessionLocal()
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if not integration:
            return

        tenant = db.query(Tenant).filter(Tenant.id == integration.tenant_id).first()
        if not tenant:
            _log_error(db, integration, "Tenant not found")
            return

        # Simple field mapping heuristics
        # Look for name, email, phone in the keys
        name = ""
        email = ""
        phone = ""
        
        for key, value in body.items():
            if not isinstance(value, str):
                continue
                
            k = key.lower()
            if not name and ('name' in k or 'first' in k or 'last' in k):
                name = value
            elif not email and ('email' in k or 'mail' in k):
                email = value
            elif not phone and ('phone' in k or 'mobile' in k or 'tel' in k):
                phone = value

        if not name and not phone and not email:
            _log_error(db, integration, "Could not extract any useful lead data from form")
            return
            
        if not name:
            name = "Website Lead"

        # 3. Connect to Tenant Schema
        tenant_engine = engine.execution_options(schema_translate_map={None: tenant.schema_name})
        tenant_db = SessionLocal(bind=tenant_engine)
        
        try:
            from sqlalchemy import text
            tenant_db.execute(text(f'SET search_path TO "{tenant.schema_name}", public'))
            
            project_id = integration.project_id
            
            # Detect duplicate
            existing_lead = lead_deduplication.find_duplicate(
                phone=phone,
                project_id=project_id,
                tenant_id=integration.tenant_id,
                db=tenant_db
            )
            
            if existing_lead:
                # Merge data
                lead_deduplication.merge_lead_data(
                    existing_lead=existing_lead,
                    new_data=body,
                    source_channel="Website Form",
                    db=tenant_db
                )
            else:
                # Create New Lead
                new_lead = Lead(
                    tenant_id=integration.tenant_id,
                    project_id=project_id,
                    name=name,
                    phone=phone or None,
                    email=email or None,
                    source_group="website",
                    source_channel="Website Form",
                    source_sub_channel=body.get("page_url", "Direct"),
                    custom_fields=body,
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
