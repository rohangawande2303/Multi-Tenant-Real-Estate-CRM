from typing import Dict, Any
import logging
from app.utils.webhook_security import normalize_phone

logger = logging.getLogger(__name__)

def parse_webhook(request_body: dict, integration_config: dict) -> Dict[str, Any]:
    """
    Parse Zapier/Generic Webhook data.
    Since Zapier is dynamic, we look for standard keys.
    """
    try:
        # User defined mapping in config could go here in future
        # For now, we use standard heuristics
        name = request_body.get("name") or request_body.get("full_name") or request_body.get("Name")
        phone = request_body.get("phone") or request_body.get("Phone") or request_body.get("mobile")
        email = request_body.get("email") or request_body.get("Email")
        
        phone = normalize_phone(phone)
        
        if not name or not phone:
             raise ValueError(f"Missing required fields: name='{name}', phone='{phone}'")

        return {
            "name": name,
            "phone": phone,
            "email": email,
            "source_group": "Online",
            "source_channel": request_body.get("source_channel") or "Zapier",
            "source_sub_channel": request_body.get("source_sub_channel") or "Generic Webhook",
            "custom_fields": {
                "zapier_raw_data": request_body,
                "integration_source": "zapier"
            }
        }
    except Exception as e:
        logger.error(f"Failed to parse Zapier webhook: {str(e)}")
        raise ValueError(f"Failed to parse Zapier webhook: {str(e)}")
