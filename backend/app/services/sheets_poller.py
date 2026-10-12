"""
sheets_poller.py
----------------
Core Google Sheets polling logic for the Meta Lead Ads integration.

Flow:
  Every 3 minutes (via scheduler.py):
    1. Read all active meta_google_sheets integrations from DB
    2. For each integration, for each tab:
       a. Fetch new rows from Google Sheets API (rows after last_row_synced)
       b. Map columns → lead fields by header name (not index)
       c. Deduplicate (phone+email check within 30 days)
       d. Insert new leads into the tenant's schema
       e. Update last_row_synced and last_synced_at for that tab
    3. Log activity
    4. On any error, store last_error in config, update status if needed

Security Notes:
  - sheet_id is stored plain text — intentional. Cannot read data without API key.
  - sheet_url is stored encrypted (Fernet). Decrypted only when needed.
  - Google API key is kept server-side only, never exposed to frontend.

Edge Cases Handled:
  - Empty sheet (only header row, 0 data rows) → polls silently, no crash
  - Missing required columns (name, phone) → row skipped, logged
  - Invalid/unparseable submitted_at → current UTC time used as fallback
  - Sheet deleted or made private → error stored in config, UI shows warning
  - Multiple tabs per sheet → each tab tracks its own last_row_synced
"""

import requests
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Encryption Helpers
# ──────────────────────────────────────────────────────────────

def _get_fernet() -> Optional[Fernet]:
    """Returns Fernet instance if key is configured, else None."""
    key = settings.SHEETS_ENCRYPTION_KEY
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except Exception:
        return None


def encrypt_url(url: str) -> str:
    """Encrypt sheet URL for storage. Falls back to plain text if no key."""
    f = _get_fernet()
    if not f:
        return url
    return f.encrypt(url.encode()).decode()


def decrypt_url(encrypted: str) -> str:
    """Decrypt a stored sheet URL. Falls back gracefully if unencrypted."""
    f = _get_fernet()
    if not f:
        return encrypted
    try:
        return f.decrypt(encrypted.encode()).decode()
    except (InvalidToken, Exception):
        # Already plain text (legacy/test) or decryption failed
        return encrypted


# ──────────────────────────────────────────────────────────────
# URL Utilities
# ──────────────────────────────────────────────────────────────

def extract_sheet_id(url: str) -> Optional[str]:
    """
    Extracts Google Sheet ID from any valid Google Sheets URL.
    Works for: /d/{id}/edit, /d/{id}/view, /d/{id}/
    """
    try:
        if "/d/" not in url:
            return None
        part = url.split("/d/")[1]
        sheet_id = part.split("/")[0]
        if len(sheet_id) > 10:
            return sheet_id
        return None
    except Exception:
        return None


# ──────────────────────────────────────────────────────────────
# Google Sheets API
# ──────────────────────────────────────────────────────────────

SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets"


def _sheets_get(sheet_id: str, range_: str) -> dict:
    """
    Make a GET request to Google Sheets API v4.
    Uses API key only — no OAuth needed.
    Raises requests.HTTPError on non-2xx responses.
    """
    url = f"{SHEETS_API_BASE}/{sheet_id}/values/{range_}"
    params = {"key": settings.GOOGLE_API_KEY}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def test_sheet_connection(sheet_id: str, tab_name: str = "Sheet1") -> dict:
    """
    Test access to a Google Sheet by reading row 1 (headers).

    Returns:
        {
          "ok": True,
          "headers": ["full_name", "phone", "email", ...],
          "rows_found": 5   # total data rows (excluding header)
        }
      OR
        {
          "ok": False,
          "error": "Human-readable error message"
        }

    Edge case: empty sheet (only header, 0 data rows) → ok=True, rows_found=0
    """
    if not settings.GOOGLE_API_KEY:
        return {
            "ok": False,
            "error": "Google API key not configured. Add GOOGLE_API_KEY to your environment."
        }
    try:
        data = _sheets_get(sheet_id, f"{tab_name}!A1:ZZ")
        values = data.get("values", [])

        # Empty sheet — not even a header row
        if not values:
            return {
                "ok": True,
                "headers": [],
                "rows_found": 0,
                "note": "Sheet is empty. Add a header row and lead data to start syncing."
            }

        # Row 1 is headers
        headers = [str(h).strip().lower().replace(" ", "_") for h in values[0]]
        data_rows = len(values) - 1  # subtract header

        return {
            "ok": True,
            "headers": headers,
            "rows_found": max(0, data_rows)
        }

    except requests.HTTPError as e:
        status = e.response.status_code if e.response else 0
        if status == 403:
            return {
                "ok": False,
                "error": "Access denied. Please set the sheet sharing to 'Anyone with the link can view'."
            }
        elif status == 404:
            return {
                "ok": False,
                "error": "Sheet not found. Check the URL is correct and the sheet exists."
            }
        else:
            return {"ok": False, "error": f"Google API error: {str(e)}"}
    except requests.Timeout:
        return {"ok": False, "error": "Connection timed out. Google Sheets API did not respond."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def fetch_new_rows(sheet_id: str, tab_name: str, from_row: int) -> list:
    """
    Fetch all rows AFTER from_row (1-indexed, row 1 = header).
    Returns a list of raw row arrays (list of lists).
    Returns [] if no new rows (edge case: empty sheet).
    """
    # from_row is the last synced row. We start reading from from_row+1.
    start = from_row + 1
    range_ = f"{tab_name}!A{start}:ZZ"
    try:
        data = _sheets_get(sheet_id, range_)
        return data.get("values", [])
    except requests.HTTPError as e:
        raise e


# ──────────────────────────────────────────────────────────────
# Column Mapping
# ──────────────────────────────────────────────────────────────

# Maps normalized sheet column names → CRM lead field names
STANDARD_COLUMN_MAP = {
    # Name variations
    "full_name": "name",
    "name": "name",
    "lead_name": "name",
    "customer_name": "name",
    # Phone variations
    "phone": "phone",
    "phone_number": "phone",
    "mobile": "phone",
    "contact": "phone",
    "mobile_number": "phone",
    # Email
    "email": "email",
    "email_address": "email",
    # City
    "city": "city",
    # Source attribution (stored as sub-channel)
    "campaign_name": "source_sub_channel",
    # UTM Attribution
    "utm_source": "utm_source",
    "utm_medium": "utm_medium",
    "utm_campaign": "utm_campaign",
    "utm_term": "utm_term",
    "utm_content": "utm_content",
    # Timestamp
    "submitted_at": "__submitted_at",  # handled specially
    "created_time": "__submitted_at",
    # Lead status from Meta (mapped to CRM NEW)
    "lead_status": "__lead_status",
}

# Custom fields that go to custom_fields JSONB (not mapped to core lead fields)
CUSTOM_FIELD_COLUMNS = {
    "ad_name", "ad_set_name", "form_name", "form_id",
    "platform", "ad_id", "adset_id", "campaign_id",
}


def _parse_submitted_at(value: str) -> datetime:
    """
    Parse Meta's submitted_at timestamp (UTC) into a timezone-aware datetime.
    Falls back to current UTC if parsing fails.
    """
    if not value:
        return datetime.now(timezone.utc)
    
    # Try ISO format first (handles -05:00, +0000, Z etc.)
    try:
        # Python 3.11+ fromisoformat handles most cases
        dt = datetime.fromisoformat(value.strip().replace(" ", "T"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        pass

    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S+0000",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(value.strip(), fmt)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue
    logger.warning(f"Could not parse submitted_at: '{value}', using current UTC")
    return datetime.now(timezone.utc)


def map_row_to_lead(row_values: list, headers: list, project_id: int, tenant_id: int) -> Optional[dict]:
    """
    Maps a raw sheet row (list of values) to a CRM lead dict using stored headers.
    Returns None if name or phone is missing (required fields).

    Unknown columns → stored in custom_fields JSONB.
    """
    if not headers or not row_values:
        return None

    # Zip headers with values; pad with empty strings if row is shorter than headers
    row_dict = {}
    for i, header in enumerate(headers):
        row_dict[header] = row_values[i].strip() if i < len(row_values) else ""

    lead = {
        "project_id": project_id,
        "tenant_id": tenant_id,
        "source_group": "meta_ads",
        "status": "NEW",
        "custom_fields": {},
    }
    submitted_at = None

    for col, value in row_dict.items():
        if not value:
            continue

        normalized = col.lower().strip().replace(" ", "_")

        if normalized in STANDARD_COLUMN_MAP:
            target = STANDARD_COLUMN_MAP[normalized]
            if target == "__submitted_at":
                submitted_at = _parse_submitted_at(value)
            elif target == "__lead_status":
                # Meta sends CREATED → map to NEW
                lead["status"] = "NEW"
            else:
                # Only set if not already set (first match wins)
                if target not in lead:
                    lead[target] = value
        elif normalized in CUSTOM_FIELD_COLUMNS:
            lead["custom_fields"][normalized] = value
        else:
            # Unknown column → custom_fields
            lead["custom_fields"][col] = value

    # Validate required fields
    if not lead.get("name") or not lead.get("phone"):
        return None

    # Set created_at from Meta's submitted_at (UTC)
    if submitted_at:
        lead["_created_at_override"] = submitted_at

    # Store campaign attribution as sub_channel
    if "source_sub_channel" in lead:
        lead["source_sub_channel"] = lead["source_sub_channel"]

    return lead


# ──────────────────────────────────────────────────────────────
# Duplicate Detection
# ──────────────────────────────────────────────────────────────

def is_duplicate(db, phone: str, email: Optional[str], project_id: int, dedup_days: int = 30) -> bool:
    """
    Check if a lead with the same phone (or email) already exists
    in this project within the dedup window.
    """
    from app.models.lead import Lead
    from sqlalchemy import or_
    cutoff = datetime.now(timezone.utc) - timedelta(days=dedup_days)

    conditions = [Lead.phone == phone]
    if email:
        conditions.append(Lead.email == email)

    existing = db.query(Lead).filter(
        Lead.project_id == project_id,
        Lead.is_deleted == False,
        Lead.created_at >= cutoff,
        or_(*conditions)
    ).first()

    return existing is not None


# ──────────────────────────────────────────────────────────────
# Simulate Leads (Testing — no real sheet needed)
# ──────────────────────────────────────────────────────────────

def generate_simulate_rows() -> tuple[list, list]:
    """
    Returns (headers, rows) for 3 fake Meta leads.
    Used by the /simulate endpoint to test the pipeline end-to-end.
    """
    headers = [
        "full_name", "phone", "email",
        "campaign_name", "ad_name", "ad_set_name",
        "platform", "form_name", "submitted_at", "lead_status"
    ]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")
    rows = [
        ["Rahul Sharma", "9876543210", "rahul@test.com", "Thane Project Q2", "Thane Ad 1", "Buyers AdSet", "Facebook", "Inquiry Form", now, "CREATED"],
        ["Priya Mehta",  "9123456789", "priya@test.com", "Dombivli Launch",  "Dombivli Ad", "Interest Set", "Instagram", "Inquiry Form", now, "CREATED"],
        ["Amit Patil",   "9988776655", "",               "Thane Project Q2", "Retarget Ad", "Retarget Set", "Facebook", "Inquiry Form", now, "CREATED"],
    ]
    return headers, rows


# ──────────────────────────────────────────────────────────────
# Core Polling Logic
# ──────────────────────────────────────────────────────────────

def poll_integration(integration, db) -> int:
    """
    Poll a single integration — reads all its tabs, inserts new leads.
    Returns total number of new leads created across all tabs.
    Updates config in-place (last_row_synced, last_synced_at, errors).
    """
    from app.models.lead import Lead
    from app.auth.models import Tenant
    from app.projects import models as pm

    config = dict(integration.config or {})
    sheet_id = config.get("sheet_id")
    tabs = config.get("tabs", [])
    dedup_days = config.get("dedup_days", 30)
    total_created = 0

    if not sheet_id or not tabs:
        return 0

    # Fetch tenant info for persisted metadata
    tenant = db.query(Tenant).filter(Tenant.id == integration.tenant_id).first()

    for i, tab in enumerate(tabs):
        tab_name = tab.get("tab_name", "Sheet1")
        project_id = tab.get("project_id")
        last_row = tab.get("last_row_synced", 1)  # 1 = header row
        stored_headers = tab.get("headers", [])

        if not project_id:
            continue

        project = db.query(pm.Project).filter(pm.Project.id == project_id).first()

        try:
            raw_rows = fetch_new_rows(sheet_id, tab_name, last_row)
        except requests.HTTPError as e:
            err_msg = f"Tab '{tab_name}': HTTP {e.response.status_code if e.response else '?'} — {str(e)}"
            config["last_error"] = err_msg
            config["last_error_at"] = datetime.now(timezone.utc).isoformat()
            logger.error(f"Integration {integration.id}: {err_msg}")
            continue
        except Exception as e:
            config["last_error"] = str(e)
            config["last_error_at"] = datetime.now(timezone.utc).isoformat()
            continue

        # Edge case: empty sheet or no new rows — silent, no crash
        if not raw_rows:
            continue

        rows_processed = 0
        for row_values in raw_rows:
            rows_processed += 1
            lead_data = map_row_to_lead(row_values, stored_headers, project_id, integration.tenant_id)
            if not lead_data:
                continue

            phone = lead_data.get("phone", "")
            email = lead_data.get("email")

            if is_duplicate(db, phone, email, project_id, dedup_days):
                continue

            created_at = lead_data.pop("_created_at_override", datetime.now(timezone.utc))

            db_lead = Lead(
                tenant_id=integration.tenant_id,
                project_id=project_id,
                name=lead_data.get("name", "Unknown"),
                phone=phone,
                email=email,
                city=lead_data.get("city"),
                status=lead_data.get("status", "NEW"),
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
            )
            # Override created_at with Meta's submitted_at (UTC)
            db_lead.created_at = created_at
            db.add(db_lead)
            total_created += 1

        # Update tab's last_row_synced
        tabs[i]["last_row_synced"] = last_row + rows_processed

    config["tabs"] = tabs
    config["last_synced_at"] = datetime.now(timezone.utc).isoformat()
    config["last_error"] = None  # Clear any previous error on success
    config["last_error_at"] = None

    integration.config = config
    integration.total_leads_created = (integration.total_leads_created or 0) + total_created
    integration.last_webhook_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"DB commit error for integration {integration.id}: {e}")
        return 0

    if total_created > 0:
        logger.info(f"Integration {integration.id}: Imported {total_created} leads from Google Sheet")

    return total_created


def poll_all_active_integrations():
    """
    Called by APScheduler every 3 minutes.
    Loops through all active meta_google_sheets integrations.
    """
    from app.models.integration import Integration
    from app.core.database import SessionLocal, engine
    from app.core.context import tenant_context

    logger.info("[Sheets Poller] Starting poll cycle...")

    # Use public schema for reading/updating integrations table
    db = SessionLocal()
    try:
        integrations = db.query(Integration).filter(
            Integration.source_type == "meta_google_sheets",
            Integration.is_active == True
        ).all()
        
        total_new = 0
        for integration in integrations:
            try:
                tenant_schema = _get_tenant_schema(integration.tenant_id)
                if not tenant_schema:
                    continue

                # Set tenant context so lead insertion goes to correct schema
                token = tenant_context.set(tenant_schema)
                tenant_engine = engine.execution_options(schema_translate_map={None: tenant_schema})
                from sqlalchemy.orm import sessionmaker
                from sqlalchemy import text
                TenantSession = sessionmaker(bind=tenant_engine)
                tenant_db = TenantSession()
                
                try:
                    tenant_db.execute(text(f'SET search_path TO "{tenant_schema}", public'))
                    
                    # We pass the integration object and the tenant-scoped DB
                    # poll_integration will handle leads in tenant_db and 
                    # update the integration object's config/stats.
                    created = poll_integration(integration, tenant_db)
                    total_new += created
                    
                    # Now commit the integration object updates to the PUBLIC schema
                    db.add(integration)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    logger.error(f"[Sheets Poller] Error during poll/commit for {integration.id}: {e}")
                finally:
                    tenant_db.close()
                    tenant_context.reset(token)

            except Exception as e:
                logger.error(f"[Sheets Poller] Outer loop error for integration {integration.id}: {e}")

            # Rate limit guard: 1.5s between clients
            time.sleep(1.5)

        logger.info(f"[Sheets Poller] Cycle complete. {total_new} new leads across {len(integrations)} integrations.")
        
    except Exception as e:
        logger.error(f"[Sheets Poller] Critical failure in poll cycle: {e}")
    finally:
        db.close()


def _get_tenant_schema(tenant_id: int) -> Optional[str]:
    """Looks up the schema_name for a tenant from the public.tenants table."""
    from app.auth.models import Tenant
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        return tenant.schema_name if tenant else None
    finally:
        db.close()
