from typing import Dict, Any
import logging
from app.utils.webhook_security import normalize_phone

logger = logging.getLogger(__name__)

def parse_webhook(request_body: dict, integration_config: dict) -> Dict[str, Any]:
    """
    Parse Google Ads webhook format and return normalized lead data.
    """
    try:
        user_data = request_body.get("user_column_data", [])
        
        # Parse column data into dict by column_name
        lead_info = {}
        for item in user_data:
            col_name = item.get("column_name")
            col_val = item.get("string_value")
            if col_name and col_val:
                lead_info[col_name.strip()] = col_val.strip()
        
        # Map to standard format
        # Common Google field names (case insensitive matching)
        name = lead_info.get("Full Name") or lead_info.get("First Name", "") + " " + lead_info.get("Last Name", "")
        phone = lead_info.get("User Phone") or lead_info.get("Phone Number")
        email = lead_info.get("User Email") or lead_info.get("Email")
        
        # Detect Test Leads
        is_test = request_body.get("is_test", False)
        if phone == "+10000000000" or phone == "10000000000":
            is_test = True

        name = name.strip() if name else "Unknown"
        phone = normalize_phone(phone) if phone else None
        
        if not phone:
             # We need at least a phone or email for a lead, but phone is critical in this CRM
             if not email:
                 raise ValueError("Missing both phone and email in Google lead")
             phone = "MISSING"

        # Extract UTMs from custom fields if provided, or from standard Google fields
        # Note: Google Ads webhooks can send custom fields if configured in the form
        custom_fields = {
            "google_lead_id": request_body.get("lead_id"),
            "google_form_id": request_body.get("form_id"),
            "google_campaign_id": request_body.get("campaign_id"),
            "google_adgroup_id": request_body.get("adgroup_id"),
            "google_creative_id": request_body.get("creative_id"),
            "is_test": is_test
        }

        # Add all raw data to custom_fields
        for k, v in lead_info.items():
            if k not in ["Full Name", "First Name", "Last Name", "User Phone", "Phone Number", "User Email", "Email"]:
                custom_fields[f"g_{k.lower().replace(' ', '_')}"] = v

        return {
            "name": name,
            "phone": phone,
            "email": email,
            "source_group": "google_ads",
            "source_channel": "Google Ads",
            "source_sub_channel": request_body.get("campaign_name") or integration_config.get("campaign_name", "Google Lead Form"),
            "utm_source": lead_info.get("utm_source") or "google",
            "utm_medium": lead_info.get("utm_medium") or "cpc",
            "utm_campaign": lead_info.get("utm_campaign") or request_body.get("campaign_name"),
            "utm_term": lead_info.get("utm_term"),
            "utm_content": lead_info.get("utm_content"),
            "custom_fields": custom_fields,
            "is_test": is_test
        }
    except Exception as e:
        logger.error(f"Failed to parse Google webhook: {str(e)}")
        raise ValueError(f"Failed to parse Google webhook: {str(e)}")
