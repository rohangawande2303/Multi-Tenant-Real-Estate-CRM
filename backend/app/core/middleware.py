"""
Tenant Middleware
-----------------
Key component of the Multi-Tenant architecture.

Responsibility:
1. Intercept every incoming HTTP request
2. Resolve tenant from:
   - X-Tenant-ID header (preferred)
   - JWT claim (Phase-1 / API clients)
3. Set tenant_context for schema switching
"""

import re
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request
import jwt

from app.core.context import tenant_context
from app.core.config import settings
from app.core.database import SessionLocal

SCHEMA_NAME_REGEX = re.compile(r"^[a-z][a-z0-9_]{2,40}$")

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        # ==========================================
        # 1️⃣ Resolve tenant from JWT (Phase-1)
        # ==========================================
        auth_header = request.headers.get("Authorization")
        jwt_tenant_schema = None
        user_role = None

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM],
                )

                tenant_id = payload.get("tenant_id")
                user_role = payload.get("role")

                if tenant_id:
                    from app.auth.models import Tenant
                    db = SessionLocal()
                    tenant = (
                        db.query(Tenant)
                        .filter(Tenant.id == tenant_id)
                        .first()
                    )
                    db.close()

                    if tenant:
                        jwt_tenant_schema = tenant.schema_name

            except Exception:
                jwt_tenant_schema = None

        # ==========================================
        # 2️⃣ Validate X-Tenant-ID header (spoofing protection)
        # ==========================================
        header_tenant_schema = request.headers.get("X-Tenant-ID")

        if header_tenant_schema:
            header_tenant_schema = header_tenant_schema.strip()
            # Support Numeric Tenant ID in Header
            if header_tenant_schema.isdigit():
                from app.auth.models import Tenant
                db = SessionLocal()
                tenant = db.query(Tenant).filter(Tenant.id == int(header_tenant_schema)).first()
                if tenant:
                    header_tenant_schema = tenant.schema_name
                db.close()
            else:
                # Validate schema name format
                if not SCHEMA_NAME_REGEX.match(header_tenant_schema) and header_tenant_schema != "public":
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "Invalid tenant identifier or schema name format"}
                    )

        # If user has a tenant claim and specifies a header:
        # Non-agency users MUST match their own tenant
        if jwt_tenant_schema and header_tenant_schema:
            if jwt_tenant_schema != header_tenant_schema:
                if user_role not in ["agency", "agency_admin", "developer"]:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Tenant mismatch: header does not match JWT claim"}
                    )

        # Determine final schema
        tenant_schema = header_tenant_schema if (user_role in ["agency", "agency_admin", "developer"] and header_tenant_schema) else (jwt_tenant_schema or header_tenant_schema or "public")

        # ==========================================
        # 3️⃣ Safe fallback & strict validation
        # ==========================================
        if not tenant_schema:
            tenant_schema = "public"

        if tenant_schema != "public" and not SCHEMA_NAME_REGEX.match(tenant_schema):
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid tenant schema format"}
            )

        # ==========================================
        # 4️⃣ Set tenant context
        # ==========================================
        token = tenant_context.set(tenant_schema)

        try:
            response = await call_next(request)
        finally:
            tenant_context.reset(token)

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting strict OWASP security headers into all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none';"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

