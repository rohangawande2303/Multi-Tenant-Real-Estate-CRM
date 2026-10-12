from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

def parse_webhook(request_body: dict, integration_config: dict) -> Dict[str, Any]:
    """
    Parse Meta Ads webhook format and return normalized lead data.
    """
    try:
        # Meta structure: entry[0].changes[0].value.field_data[]
        entry = request_body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        field_data = value.get("field_data", [])
        
        # Parse field_data array into dict
        lead_info = {}
        for field in field_data:
            field_name = field.get("name")
            field_values = field.get("values", [])
            if field_values:
                lead_info[field_name] = field_values[0]
        
        # Map to standard format
        # Common Meta field names: full_name, phone_number, email
        name = lead_info.get("full_name") or lead_info.get("name")
        phone = lead_info.get("phone_number") or lead_info.get("phone")
        email = lead_info.get("email")
        
        if not name or not phone:
            # Sometimes field names are different or payload is empty/test
            # Return what we have or raise error if it's not a lead
            if not value.get("leadgen_id"):
                raise ValueError("Payload does not contain valid lead data (missing leadgen_id)")
                
        # Normalize phone
        from app.utils.webhook_security import normalize_phone # I'll add this to security utils
        phone = normalize_phone(phone) if phone else None
        
        if not name or not phone:
             raise ValueError(f"Missing required fields after parsing: name='{name}', phone='{phone}'")

        return {
            "name": name,
            "phone": phone,
            "email": email,
            "source_group": "Online",
            "source_channel": "Meta Ads",
            "source_sub_channel": integration_config.get("campaign_name", "Facebook Lead Form"),
            "custom_fields": {
                "meta_leadgen_id": value.get("leadgen_id"),
                "meta_form_id": value.get("form_id"),
                "meta_ad_id": value.get("ad_id"),
                "meta_page_id": value.get("page_id"),
                "meta_created_time": value.get("created_time"),
                "meta_raw_data": lead_info # Full data stored in JSONB
            }
        }
    except Exception as e:
        logger.error(f"Failed to parse Meta webhook: {str(e)}")
        raise ValueError(f"Failed to parse Meta webhook: {str(e)}")
