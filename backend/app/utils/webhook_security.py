import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List

# In-memory rate limiting (simple implementation)
# In production, this should use Redis
# structure: { integration_id: [timestamp1, timestamp2, ...] }
webhook_rate_limits: Dict[str, List[float]] = {}

def check_rate_limit(integration_id: str, max_per_hour: int = 1000) -> bool:
    """
    Check if an integration has exceeded its hourly rate limit.
    """
    now = time.time()
    hour_ago = now - 3600
    
    # Initialize if not present
    if integration_id not in webhook_rate_limits:
        webhook_rate_limits[integration_id] = []
        
    # Clean up old timestamps
    webhook_rate_limits[integration_id] = [
        ts for ts in webhook_rate_limits[integration_id] 
        if ts > hour_ago
    ]
    
    # Check limit
    if len(webhook_rate_limits[integration_id]) >= max_per_hour:
        return False
    
    # Track this request
    webhook_rate_limits[integration_id].append(now)
    return True

def verify_meta_signature(payload: bytes, signature: str, app_secret: str) -> bool:
    """
    Verify Meta webhook signature (sha256).
    Meta signature header format: sha256={hash}
    """
    if not signature or not app_secret:
        return True # Skip if not strictly required or not configured
        
    if not signature.startswith("sha256="):
        return False
        
    expected_hash = hmac.new(
        app_secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    actual_hash = signature.replace("sha256=", "")
    
    return hmac.compare_digest(expected_hash, actual_hash)

def verify_google_signature(payload: str, signature: str, token: str) -> bool:
    """
    Verify Google Ads webhook signature (simple token-based check for now).
    Google usually sends a verification token in the request body or header.
    """
    if not signature or not token:
        return True
    
    # Implementation varies based on how Google Cloud/Ads is configured
    # For basic verification, we check if the token matches
    return signature == token

def generate_webhook_secret() -> str:
    """
    Generate a random 32-character secret key for webhooks.
    """
    import secrets
    return secrets.token_hex(16)

def normalize_phone(phone: str) -> str:
    """
    Normalize phone to 10 digits.
    """
    if not phone:
        return ""
    # Remove all non-digits
    digits = ''.join(filter(str.isdigit, str(phone)))
    
    # Remove country code if present (e.g., 91 or +91)
    if len(digits) > 10:
        digits = digits[-10:]
    
    return digits
