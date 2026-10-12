"""
API Router Configuration
------------------------
Central router that aggregates all API endpoint routers.

This file is the main entry point for all API routes under /api/v1.
Each endpoint module (auth, tenants, projects, users) is included here
with its own prefix and tags for Swagger documentation.

Multi-Tenant Note:
- All routes except /auth/register and /auth/login require authentication
- Tenant context is set by TenantMiddleware based on JWT token
- Each request automatically scoped to the user's tenant schema
"""

# ✅ CRITICAL FIX: Import APIRouter from FastAPI
from fastapi import APIRouter
from app.auth.models import User # Ensure User is registered first

# Import all endpoint routers
from app.api.endpoints import auth, tenants, projects, users, leads, import_export, integrations, webhooks, agency, logs, notifications, dashboard, ingest_google, ingest_website

# Create the main API router
# This will be mounted at /api/v1 in main.py
api_router = APIRouter()

# Include Authentication endpoints
# Handles: /register, /login, /logout, /refresh-token  
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Include Tenant Management endpoints (Agency/Super Admin only)
# Handles: tenant creation, listing, schema management
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])

# Include Project endpoints
# Handles: project CRUD, assignment, filtering
# Access: Agency/Developer see all, Sales Manager sees assigned only
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Include User Management endpoints
# Handles: user creation, role assignment, project assignment
# Role hierarchy and permissions
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Include Lead Management endpoints
# Leads, Activity, and Scoping
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])

# Include Import/Export endpoints
api_router.include_router(import_export.router, prefix="/data", tags=["import-export"])

# Include Integration Management endpoints
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

# Include Webhook endpoints
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

# Include Agency Management endpoints
api_router.include_router(agency.router, prefix="/agency", tags=["agency"])

# Include Activity Logs endpoints
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])

# Include Notification endpoints
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

# Include Dashboard endpoints
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# Include Google Ingestion endpoints
api_router.include_router(ingest_google.router, prefix="/ingest/google", tags=["ingest-google"])

# Include Website Ingestion endpoints
api_router.include_router(ingest_website.router, prefix="/ingest/website", tags=["ingest-website"])