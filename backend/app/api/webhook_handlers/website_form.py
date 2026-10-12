from typing import Dict, Any
import logging
from app.utils.webhook_security import normalize_phone

logger = logging.getLogger(__name__)

def parse_webhook(request_body: dict, integration_config: dict) -> Dict[str, Any]:
    """
    Parse Website Form submission (JSON or Form-Encoded).
    """
    try:
        # Standard field naming conventions
        name = request_body.get("name") or request_body.get("full_name") or request_body.get("Name")
        phone = request_body.get("phone") or request_body.get("mobile") or request_body.get("Phone")
        email = request_body.get("email") or request_body.get("Email")
        
        # Source info
        source_channel = request_body.get("source_channel") or "Website Form"
        source_sub_channel = request_body.get("source_sub_channel") or request_body.get("page_url") or "Contact Page"
        
        phone = normalize_phone(phone)
        
        if not name or not phone:
             raise ValueError(f"Missing required fields: name='{name}', phone='{phone}'")

        return {
            "name": name,
            "phone": phone,
            "email": email,
            "source_group": "Organic",
            "source_channel": source_channel,
            "source_sub_channel": source_sub_channel,
            "custom_fields": {
                "website_message": request_body.get("message") or request_body.get("Message"),
                "website_page_url": request_body.get("page_url"),
                "website_ip": request_body.get("ip_address"),
                "website_raw_data": request_body
            }
        }
    except Exception as e:
        logger.error(f"Failed to parse Website Form webhook: {str(e)}")
        raise ValueError(f"Failed to parse Website Form webhook: {str(e)}")
