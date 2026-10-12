
from sqlalchemy.orm import Session
from fastapi import Request
from app.auth.models import UserActivityLog
from typing import Optional, Any, Dict
import json

class ActivityService:
    def log_activity(
        self,
        db: Session,
        user_id: int,
        action_type: str,
        request: Optional[Request] = None,
        tenant_id: Optional[int] = None,
        project_id: Optional[int] = None,
        role: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Creates an immutable activity log entry.
        Automatically captures IP and User-Agent if request is provided.
        """
        try:
            ip_address = None
            user_agent = None
            
            if request:
                # Capture IP (handling proxies)
                ip_address = request.headers.get("x-forwarded-for") or request.client.host
                # Capture User Agent
                user_agent = request.headers.get("user-agent")

            log_entry = UserActivityLog(
                user_id=user_id,
                tenant_id=tenant_id,
                project_id=project_id,
                role=role,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                description=description,
                ip_address=ip_address,
                user_agent=user_agent,
                meta_data=metadata
            )
            db.add(log_entry)
            db.commit()
            return log_entry
        except Exception as e:
            # We don't want logging to crash the main request
            db.rollback()
            print(f"FAILED TO LOG ACTIVITY: {e}")
            return None

activity_service = ActivityService()
