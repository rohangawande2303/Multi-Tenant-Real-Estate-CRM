import json
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.concurrency import iterate_in_threadpool
from app.core.database import SessionLocal
from app.auth.models import UserActivityLog, Tenant, User
import jwt
from app.core.config import settings
from typing import Optional

class ActivityMiddleware(BaseHTTPMiddleware):
    """
    Enterprise Activity Middleware
    -----------------------------
    Automatically logs all mutative HTTP requests (POST, PUT, PATCH, DELETE)
    and captures security-relevant metadata.
    """
    async def dispatch(self, request: Request, call_next):
        # 1. Skip GET requests for performance (unless it's a specific tracking endpoint)
        if request.method == "GET":
            return await call_next(request)

        # 2. Capture Request Body (Carefully)
        # Reading body consumes the stream, so we must replace it
        body = b""
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
            # Restore stream for downstream handlers
            async def receive():
                return {"type": "http.request", "body": body}
            request._receive = receive

        # 3. Resolve User context (if authenticated)
        user_id = None
        tenant_id = None
        user_role = None
        
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id = payload.get("id")
                tenant_id = payload.get("tenant_id")
                # We can fetch role if needed, or get it from payload if stored there
                user_role = payload.get("role")
            except:
                pass

        # 4. Execute Request
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # 5. Log if not an excluded path
        excluded_paths = ["/api/v1/logs/log", "/api/v1/auth/login", "/health"]
        if not any(request.url.path.startswith(path) for path in excluded_paths):
            try:
                db = SessionLocal()
                
                # Payload processing
                payload_data = None
                if body:
                    try:
                        payload_data = json.loads(body.decode())
                        # Mask sensitive fields
                        if "password" in payload_data:
                            payload_data["password"] = "********"
                    except:
                        payload_data = {"raw_body": "Could not parse JSON"}

                log_entry = UserActivityLog(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    project_id=payload_data.get("project_id") if isinstance(payload_data, dict) else None,
                    role=user_role,
                    action_type=f"{request.method} {request.url.path}",
                    entity_type=self._get_entity_type(request.url.path),
                    entity_id=self._get_entity_id(request.url.path),
                    description=f"{request.method} request to {request.url.path}",
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    page_url=str(request.url),
                    http_method=request.method,
                    request_payload=payload_data,
                    response_status=response.status_code,
                    meta_data={"duration_ms": int(duration * 1000)}
                )
                db.add(log_entry)
                db.commit()
                db.close()
            except Exception as e:
                print(f"FAILED TO STORE ACTIVITY LOG: {e}")

        return response

    def _get_entity_type(self, path: str) -> Optional[str]:
        parts = path.split("/")
        if len(parts) > 3:
            return parts[3] # e.g. /api/v1/leads -> leads
        return None

    def _get_entity_id(self, path: str) -> Optional[str]:
        parts = path.split("/")
        if len(parts) > 4:
            return parts[4] # e.g. /api/v1/leads/123 -> 123
        return None
