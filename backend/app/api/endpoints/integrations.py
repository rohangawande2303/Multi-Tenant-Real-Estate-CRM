from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import secrets

from app.core.database import get_db
from app.api import deps
from app import models
from app.auth.models import User
from app.auth.roles import UserRole
from app.utils.webhook_security import generate_webhook_secret

router = APIRouter()

# =============================================================================
# EXISTING WEBHOOK-BASED INTEGRATION ENDPOINTS (unchanged)
# =============================================================================

@router.post("/", response_model=Dict[str, Any])
def create_integration(
    integration_in: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new lead integration for a project.
    """
    # 1. Permission check
    if current_user.role not in [UserRole.AGENCY, UserRole.DEVELOPER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # 2. Extract and validate
    project_id = integration_in.get("project_id")
    source_type = integration_in.get("source_type")
    source_name = integration_in.get("source_name")
    
    if not project_id or not source_type or not source_name:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # 3. Generate credentials
    secret = generate_webhook_secret()
    integration_id = uuid.uuid4()
    
    # Construct Webhook URL
    # In production, this would use the real base URL from settings
    base_url = "http://localhost:8000" # Placeholder
    webhook_url = f"{base_url}/api/v1/webhooks/{source_type}?integration_id={integration_id}"

    # 4. Create record
    db_integration = models.Integration(
        id=integration_id,
        tenant_id=current_user.tenant_id,
        project_id=project_id,
        source_type=source_type,
        source_name=source_name,
        config=integration_in.get("config", {}),
        webhook_url=webhook_url,
        webhook_secret=secret,
        created_by=current_user.id
    )
    
    db.add(db_integration)
    db.commit()
    db.refresh(db_integration)

    return {
        "success": True,
        "integration_id": str(db_integration.id),
        "webhook_url": db_integration.webhook_url,
        "webhook_secret": db_integration.webhook_secret,
        "setup_instructions": get_instructions(source_type, db_integration.webhook_url)
    }

@router.get("/")
def list_integrations(
    project_id: Optional[int] = None,
    source_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    List integrations for current user's tenant.
    """
    query = db.query(models.Integration).filter(models.Integration.tenant_id == current_user.tenant_id)
    
    if project_id:
        query = query.filter(models.Integration.project_id == project_id)
    if source_type:
        query = query.filter(models.Integration.source_type == source_type)
    if is_active is not None:
        query = query.filter(models.Integration.is_active == is_active)
        
    integrations = query.all()
    return {"integrations": integrations}

@router.get("/{id}")
def get_integration(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Get detailed integration configuration.
    """
    integration = db.query(models.Integration).filter(
        models.Integration.id == id,
        models.Integration.tenant_id == current_user.tenant_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    return {"integration": integration}

@router.put("/{id}")
def update_integration(
    id: uuid.UUID,
    integration_update: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Update integration configuration.
    """
    db_integration = db.query(models.Integration).filter(
        models.Integration.id == id,
        models.Integration.tenant_id == current_user.tenant_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    if "is_active" in integration_update:
        db_integration.is_active = integration_update["is_active"]
    if "source_name" in integration_update:
        db_integration.source_name = integration_update["source_name"]
    if "config" in integration_update:
        # Merge config
        if not db_integration.config:
            db_integration.config = {}
        db_integration.config.update(integration_update["config"])
        
    db_integration.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_integration)
    return {"success": True, "integration": db_integration}

@router.delete("/{id}")
def delete_integration(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Delete an integration.
    """
    db_integration = db.query(models.Integration).filter(
        models.Integration.id == id,
        models.Integration.tenant_id == current_user.tenant_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    db.delete(db_integration)
    db.commit()
    return {"success": True, "message": "Integration deleted"}

@router.get("/{id}/logs")
def get_integration_logs(
    id: uuid.UUID,
    limit: int = Query(50, le=100),
    status: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Get webhook logs for an integration.
    """
    query = db.query(models.WebhookLog).filter(
        models.WebhookLog.integration_id == id,
        models.WebhookLog.tenant_id == current_user.tenant_id
    )
    
    if status:
        query = query.filter(models.WebhookLog.response_status == status)
        
    logs = query.order_by(models.WebhookLog.created_at.desc()).limit(limit).all()
    return {"logs": logs}

def get_instructions(source_type: str, webhook_url: str) -> Dict[str, str]:
    """
    Returns setup instructions for the specific source.
    """
    if source_type == "meta_ads":
        return {
            "step_1": "Go to Meta Business Manager Settings",
            "step_2": "Navigate to Integrations -> Leads Setup",
            "step_3": "Configure Webhook delivery",
            "step_4": f"Paste Webhook URL: {webhook_url}",
            "step_5": "Subscribe to 'leads' events",
            "test": "Use Meta Lead Testing Tool to send a test JSON"
        }
    elif source_type == "google_ads":
        return {
            "step_1": "In Google Ads, create a Lead Form Extension",
            "step_2": "Expand 'Other data-integration options'",
            "step_3": f"Enter Webhook URL: {webhook_url}",
            "step_4": "Enter the Webhook Secret as the 'Key'",
            "test": "Click 'Send Test Data' in Google Ads"
        }
    elif source_type == "website_form":
        return {
            "step_1": "Configure your website contact form to send a POST request",
            "step_2": f"Target URL: {webhook_url}",
            "step_3": "Supported formats: JSON or application/x-www-form-urlencoded",
            "fields": "Send 'name', 'phone', 'email' in the request body"
        }
    else:
        return {
            "step_1": "Copy the Webhook URL",
            "step_2": f"Configure your source to send events to: {webhook_url}",
            "test": "Send a sample POST request to verify"
        }


# =============================================================================
# META GOOGLE SHEETS INTEGRATION ENDPOINTS (new)
# =============================================================================

@router.post("/meta-sheets/test")
def test_sheet_connection_endpoint(
    payload: Dict[str, Any],
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Test connection to a Google Sheet by reading row 1 (headers).
    Client just needs to set sheet to "Anyone with the link can view".

    Body: { "sheet_url": "https://docs.google.com/spreadsheets/d/.../edit", "tab": "Sheet1" }

    Returns:
        { "ok": true, "headers": [...], "rows_found": 5 }
        { "ok": false, "error": "Please set sheet to Anyone with link can view" }
    """
    from app.services.sheets_poller import extract_sheet_id, test_sheet_connection

    sheet_url = payload.get("sheet_url", "")
    tab = payload.get("tab", "Sheet1")

    sheet_id = extract_sheet_id(sheet_url)
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit")

    result = test_sheet_connection(sheet_id, tab)
    return result


@router.post("/meta-sheets/")
def create_meta_sheets_integration(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a Meta Google Sheets integration for the client's tenant.

    Body:
    {
        "source_name": "Meta Ads - Project X",
        "sheet_url": "https://docs.google.com/spreadsheets/d/.../edit",
        "tabs": [
            { "tab_name": "Sheet1", "project_id": 1 }
        ]
    }

    - Extracts sheet_id from URL
    - Encrypts the full URL before storing
    - Reads row 1 of each tab to store column headers
    - Sets last_row_synced = 1 (header row) per tab
    """
    from app.services.sheets_poller import extract_sheet_id, encrypt_url, test_sheet_connection

    # Permission check
    allowed_roles = [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    sheet_url = payload.get("sheet_url", "")
    source_name = payload.get("source_name", "Meta Ads (Google Sheets)")
    tabs_input = payload.get("tabs", [])

    if not tabs_input:
        raise HTTPException(status_code=400, detail="At least one tab mapping is required")

    sheet_id = extract_sheet_id(sheet_url)
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Invalid Google Sheets URL")

    # Use the first tab's project_id as the integration's primary project
    primary_project_id = tabs_input[0].get("project_id")
    if not primary_project_id:
        raise HTTPException(status_code=400, detail="project_id is required for each tab")

    # Read headers for each tab on connect
    tabs_config = []
    for tab_input in tabs_input:
        tab_name = tab_input.get("tab_name", "Sheet1")
        project_id = tab_input.get("project_id")
        if not project_id:
            continue

        # Test connection and read headers
        test_result = test_sheet_connection(sheet_id, tab_name)
        headers = test_result.get("headers", []) if test_result.get("ok") else []

        tabs_config.append({
            "tab_name": tab_name,
            "project_id": project_id,
            "last_row_synced": 1,  # 1 = header row, start reading from row 2
            "headers": headers
        })

    # Build config JSONB
    config = {
        "encrypted_sheet_url": encrypt_url(sheet_url),
        "sheet_id": sheet_id,  # Stored plain text — intentional, harmless without API key
        "tabs": tabs_config,
        "last_synced_at": None,
        "last_error": None,
        "last_error_at": None,
        "dedup_days": 30
    }

    integration_id = uuid.uuid4()
    db_integration = models.Integration(
        id=integration_id,
        tenant_id=current_user.tenant_id,
        project_id=primary_project_id,
        source_type="meta_google_sheets",
        source_name=source_name,
        config=config,
        is_active=True,
        created_by=current_user.id
    )

    db.add(db_integration)
    db.commit()
    db.refresh(db_integration)

    return {
        "success": True,
        "integration_id": str(db_integration.id),
        "tabs_connected": len(tabs_config),
        "message": f"Integration created. Polling will start within 3 minutes."
    }


@router.get("/meta-sheets/")
def list_meta_sheets_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List all meta_google_sheets integrations for the current tenant.
    Returns config details including sync status and error state.
    """
    integrations = db.query(models.Integration).filter(
        models.Integration.tenant_id == current_user.tenant_id,
        models.Integration.source_type == "meta_google_sheets"
    ).all()

    results = []
    for intg in integrations:
        config = intg.config or {}
        results.append({
            "id": str(intg.id),
            "source_name": intg.source_name,
            "is_active": intg.is_active,
            "total_leads_created": intg.total_leads_created or 0,
            "tabs": config.get("tabs", []),
            "last_synced_at": config.get("last_synced_at"),
            "last_error": config.get("last_error"),
            "last_error_at": config.get("last_error_at"),
            "created_at": intg.created_at.isoformat() if intg.created_at else None
        })

    return {"integrations": results}


@router.get("/meta-sheets/{integration_id}/status")
def get_meta_sheets_status(
    integration_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get detailed status for a specific Meta Sheets integration.
    Includes per-tab sync status and error state.
    """
    intg = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.tenant_id == current_user.tenant_id,
        models.Integration.source_type == "meta_google_sheets"
    ).first()

    if not intg:
        raise HTTPException(status_code=404, detail="Meta Sheets integration not found")

    config = intg.config or {}
    return {
        "id": str(intg.id),
        "source_name": intg.source_name,
        "is_active": intg.is_active,
        "total_leads_created": intg.total_leads_created or 0,
        "tabs": config.get("tabs", []),
        "last_synced_at": config.get("last_synced_at"),
        "last_error": config.get("last_error"),
        "last_error_at": config.get("last_error_at"),
    }


@router.patch("/meta-sheets/{integration_id}")
def update_meta_sheets_integration(
    integration_id: uuid.UUID,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update tab mappings for an existing Meta Sheets integration.
    Allows clients to add new tabs (new forms) or remove old ones.

    Body:
    {
        "tabs": [
            { "tab_name": "Sheet1", "project_id": 1 },
            { "tab_name": "Dombivli", "project_id": 2 }
        ],
        "is_active": true
    }
    """
    from app.services.sheets_poller import test_sheet_connection

    intg = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.tenant_id == current_user.tenant_id,
        models.Integration.source_type == "meta_google_sheets"
    ).first()

    if not intg:
        raise HTTPException(status_code=404, detail="Integration not found")

    config = dict(intg.config or {})

    # Update is_active
    if "is_active" in payload:
        intg.is_active = payload["is_active"]

    # Update source_name
    if "source_name" in payload:
        intg.source_name = payload["source_name"]

    # Update tabs
    if "tabs" in payload:
        new_tabs_input = payload["tabs"]
        existing_tabs = {t["tab_name"]: t for t in config.get("tabs", [])}
        updated_tabs = []

        for tab_input in new_tabs_input:
            tab_name = tab_input.get("tab_name", "Sheet1")
            project_id = tab_input.get("project_id")
            if not project_id:
                continue

            if tab_name in existing_tabs:
                # Preserve existing last_row_synced and headers
                existing = existing_tabs[tab_name]
                existing["project_id"] = project_id
                updated_tabs.append(existing)
            else:
                # New tab — read headers
                sheet_id = config.get("sheet_id")
                headers = []
                if sheet_id:
                    test_result = test_sheet_connection(sheet_id, tab_name)
                    headers = test_result.get("headers", []) if test_result.get("ok") else []

                updated_tabs.append({
                    "tab_name": tab_name,
                    "project_id": project_id,
                    "last_row_synced": 1,
                    "headers": headers
                })

        config["tabs"] = updated_tabs

    intg.config = config
    intg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(intg)

    return {"success": True, "tabs_count": len(config.get("tabs", []))}


@router.post("/meta-sheets/{integration_id}/simulate")
def simulate_meta_leads(
    integration_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Simulate Meta lead ingestion — injects 3 fake leads without needing a real Google Sheet.
    Used for testing the full pipeline: mapping → dedup → insert → leads page.

    - Creates leads with source_group = "meta_ads"
    - Uses the first tab's project_id
    - Skips the Google Sheets API entirely
    """
    from app.services.sheets_poller import generate_simulate_rows, map_row_to_lead, is_duplicate
    from app.models.lead import Lead
    from app.auth.models import Tenant
    from app.projects import models as pm

    intg = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.tenant_id == current_user.tenant_id,
        models.Integration.source_type == "meta_google_sheets"
    ).first()

    if not intg:
        raise HTTPException(status_code=404, detail="Integration not found")

    config = intg.config or {}
    tabs = config.get("tabs", [])
    if not tabs:
        raise HTTPException(status_code=400, detail="No tabs configured on this integration")

    # Use first tab
    tab = tabs[0]
    project_id = tab.get("project_id")

    # Generate fake rows
    headers, rows = generate_simulate_rows()

    # Fetch metadata
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    project = db.query(pm.Project).filter(pm.Project.id == project_id).first()

    created_count = 0
    for row in rows:
        lead_data = map_row_to_lead(row, headers, project_id, current_user.tenant_id)
        if not lead_data:
            continue

        phone = lead_data.get("phone", "")
        email = lead_data.get("email")

        if is_duplicate(db, phone, email, project_id, 30):
            continue

        created_at = lead_data.pop("_created_at_override", datetime.now(timezone.utc))

        db_lead = Lead(
            tenant_id=current_user.tenant_id,
            project_id=project_id,
            name=lead_data.get("name", "Unknown"),
            phone=phone,
            email=email,
            status="NEW",
            source_group="meta_ads",
            source_sub_channel=lead_data.get("source_sub_channel"),
            utm_source=lead_data.get("utm_source"),
            utm_medium=lead_data.get("utm_medium"),
            utm_campaign=lead_data.get("utm_campaign"),
            utm_term=lead_data.get("utm_term"),
            utm_content=lead_data.get("utm_content"),
            custom_fields=lead_data.get("custom_fields", {}),
            mandate_id=tenant.id if tenant else None,
            mandate_name=tenant.name if tenant else None,
            project_name=project.name if project else None,
            current_status_at_sales="NEW",
            first_sales_owner_email=current_user.email,
            created_by=current_user.id
        )
        db_lead.created_at = created_at
        db.add(db_lead)
        created_count += 1

    # Update integration stats
    intg.total_leads_created = (intg.total_leads_created or 0) + created_count
    intg.last_webhook_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "leads_created": created_count,
        "message": f"Simulated {created_count} Meta leads into project {project_id}. Check the Leads page."
    }

# ──────────────────────────────────────────────────────────────
# Google Ads Integration Management
# ──────────────────────────────────────────────────────────────

@router.post("/google-ads/")
async def create_google_ads_integration(
    project_id: int,
    source_name: str = "Google Ads Lead Form",
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a unique client_token and webhook_url for Google Ads.
    """
    # 1. Generate random secure token
    client_token = secrets.token_urlsafe(16)
    
    # 2. Build Webhook URL (client will paste this in Google Ads)
    # Using relative URL logic or config based BASE_URL would be better
    base_url = "http://localhost:8000" 
    webhook_url = f"{base_url}/api/v1/ingest/google/{client_token}"
    
    # 3. Create Integration record
    integration = models.Integration(
        tenant_id=current_user.tenant_id,
        project_id=project_id,
        source_type="google_ads",
        source_name=source_name,
        webhook_url=webhook_url,
        webhook_secret=client_token, # token stored in secret field
        config={
            "client_token": client_token,
            "verified": False,
            "verified_at": None,
            "last_error": None,
            "last_error_at": None,
            "total_leads": 0
        },
        created_by=current_user.id
    )
    
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    return {
        "success": True,
        "integration_id": str(integration.id),
        "webhook_url": webhook_url,
        "client_token": client_token
    }

@router.get("/google-ads/{integration_id}/status")
async def get_google_ads_status(
    integration_id: uuid.UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns verified status and stats for a Google Ads integration.
    """
    integration = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.tenant_id == current_user.tenant_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    config = integration.config or {}
    
    return {
        "is_active": integration.is_active,
        "verified": config.get("verified", False),
        "verified_at": config.get("verified_at"),
        "total_leads": integration.total_leads_created,
        "last_lead_at": integration.last_webhook_at,
        "last_error": config.get("last_error"),
        "last_error_at": config.get("last_error_at"),
        "webhook_url": integration.webhook_url,
        "client_token": integration.webhook_secret
    }

# ──────────────────────────────────────────────────────────────
# Website Integration Management
# ──────────────────────────────────────────────────────────────

@router.post("/website/")
async def create_website_integration(
    project_id: int,
    source_name: str = "Website Form",
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a unique client_token and script URL for Website Form tracking.
    """
    client_token = secrets.token_urlsafe(16)
    
    base_url = "http://localhost:8000" 
    # For website, the webhook_url is basically the JS script URL the user needs
    webhook_url = f"{base_url}/api/v1/ingest/website/script.js?token={client_token}"
    
    integration = models.Integration(
        tenant_id=current_user.tenant_id,
        project_id=project_id,
        source_type="website",
        source_name=source_name,
        webhook_url=webhook_url,
        webhook_secret=client_token, 
        config={
            "client_token": client_token,
            "verified": False,
            "verified_at": None,
            "last_error": None,
            "last_error_at": None,
            "total_leads": 0
        },
        created_by=current_user.id
    )
    
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    return {
        "success": True,
        "integration_id": str(integration.id),
        "webhook_url": webhook_url,
        "client_token": client_token
    }

@router.get("/website/{integration_id}/status")
async def get_website_status(
    integration_id: uuid.UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns status and stats for a Website integration.
    """
    integration = db.query(models.Integration).filter(
        models.Integration.id == integration_id,
        models.Integration.tenant_id == current_user.tenant_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    config = integration.config or {}
    
    return {
        "is_active": integration.is_active,
        "total_leads": integration.total_leads_created,
        "last_lead_at": integration.last_webhook_at,
        "last_error": config.get("last_error"),
        "last_error_at": config.get("last_error_at"),
        "webhook_url": integration.webhook_url,
        "client_token": integration.webhook_secret
    }

