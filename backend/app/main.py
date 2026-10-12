"""
Main Application Entry Point
----------------------------
This file initializes the FastAPI application, registers global middleware,
connects the API routers, and prepares the app for multi-tenant usage.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
from app.core.middleware import TenantMiddleware, SecurityHeadersMiddleware
from app.core import database
from app import models
from app.api.api import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)

# --------------------------------------------------
# Create FastAPI application instance
# --------------------------------------------------
app = FastAPI(title="Multi-Tenant Real Estate CRM")

# --------------------------------------------------
# Register Security Headers & Tenant Middlewares
# --------------------------------------------------
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TenantMiddleware)

# --------------------------------------------------
# Register CORS Middleware (Strict Origins, no wildcard with credentials)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Global Exception Handler (No Stack Traces Leaked)
# --------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Contact administrator for assistance."}
    )

# --------------------------------------------------
# Startup Event
# --------------------------------------------------
@app.on_event("startup")
def startup_event():
    # 0. Validate Startup Security (Fail-fast in production on weak/default secrets)
    settings.validate_startup_security()
    """
    Initialize database tables on application startup.
    Only create tables capable of living in 'public'.
    """
    from app.auth.models import Tenant, User, UserActivityLog
    from app.models.notification import Notification
    from app.models.integration import Integration
    from app.models.webhook_log import WebhookLog
    from app.core.database import engine
    
    infra_tables = [
        Tenant.__table__,
        User.__table__,
        UserActivityLog.__table__,
        Notification.__table__,
        Integration.__table__,
        WebhookLog.__table__
    ]
    
    logger.info(f"Provisioning public infrastructure: {[t.name for t in infra_tables]}")
    for table in infra_tables:
        try:
            table.create(bind=engine, checkfirst=True)
        except Exception as e:
            logger.info(f"Table {table.name} creation skip/info: {e}")

    # Start Google Sheets polling scheduler (every 3 minutes)
    from app.services.scheduler import start_scheduler
    start_scheduler()

# --------------------------------------------------
# Register API Routers
# --------------------------------------------------
app.include_router(api_router, prefix="/api/v1")

# Mount uploads directory for static files
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# --------------------------------------------------
# Root & Health Check Endpoints
# --------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Tenant Real Estate CRM API"}

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """
    Health check endpoint verifying both API and database connectivity.
    Suitable for Render, UptimeRobot, and container health checks.
    """
    try:
        from sqlalchemy import text
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "disconnected"}
        )

# --------------------------------------------------
# Shutdown Event
# --------------------------------------------------
@app.on_event("shutdown")
def shutdown_event():
    """Stop the Google Sheets polling scheduler."""
    from app.services.scheduler import stop_scheduler
    stop_scheduler()