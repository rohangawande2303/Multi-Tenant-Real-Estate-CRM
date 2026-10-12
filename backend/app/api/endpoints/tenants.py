import re
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.models import Tenant, User
from app.auth import schemas
from app.services import tenant_service
from app.auth.roles import UserRole
from app.api import deps
from app.auth import security
from app.core.config import settings

router = APIRouter()
SCHEMA_REGEX = re.compile(r"^[a-z][a-z0-9_]{2,40}$")

@router.post("/", response_model=schemas.Tenant)
def create_tenant(
    tenant: schemas.TenantCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user) 
):
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Tenant creation disabled in public demo mode")

    existing = db.query(Tenant).filter(Tenant.name == tenant.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant already exists")
    
    if not SCHEMA_REGEX.match(tenant.schema_name):
        raise HTTPException(status_code=400, detail="Schema name must match format: ^[a-z][a-z0-9_]{2,40}$")

    try:
        new_tenant = tenant_service.create_tenant_schema(
            db=db, 
            tenant_name=tenant.name, 
            schema_name=tenant.schema_name, 
            domain=tenant.domain
        )
        return new_tenant
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.services.email_service import email_service

@router.post("/onboard", response_model=schemas.User)
async def onboard_client(
    request: Request,
    onboard: schemas.ClientOnboard,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    Agency-level endpoint to onboard a new client tenant and their first admin.
    """
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Client onboarding disabled in public demo mode")

    if not SCHEMA_REGEX.match(onboard.schema_name):
        raise HTTPException(status_code=400, detail="Schema name must match format: ^[a-z][a-z0-9_]{2,40}$")

    # 1. Check if user already exists
    if db.query(User).filter(User.email == onboard.admin_email).first():
        raise HTTPException(status_code=400, detail="Admin email already registered")

    # 2. Check if tenant exists
    if db.query(Tenant).filter(Tenant.schema_name == onboard.schema_name).first():
        raise HTTPException(status_code=400, detail="Tenant/Schema already exists")

    try:
        # 3. Create Tenant
        new_tenant = tenant_service.create_tenant_schema(
            db=db,
            tenant_name=onboard.name,
            schema_name=onboard.schema_name,
            domain=onboard.domain
        )

        # 4. Create Admin User for this Tenant
        hashed_password = security.get_password_hash(onboard.admin_password)
        new_user = User(
            email=onboard.admin_email,
            hashed_password=hashed_password,
            role=UserRole.CLIENT_ADMIN,
            tenant_id=new_tenant.id,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Log activity
        from app.services.activity_service import activity_service
        activity_service.log_activity(
            db=db,
            user_id=current_user.id,
            request=request,
            tenant_id=current_user.tenant_id,
            role=current_user.role,
            action_type="CLIENT_ONBOARD",
            entity_type="tenant",
            entity_id=str(new_tenant.id),
            description=f"Onboarded client: {onboard.name} with admin {onboard.admin_email}"
        )

        # 5. Send Welcome Email
        try:
            await email_service.send_onboarding_email(
                email=onboard.admin_email,
                password=onboard.admin_password,
                tenant_name=onboard.name
            )
        except Exception as email_err:
            print(f"Failed to send onboarding email: {email_err}")

        return new_user

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")

@router.get("/", response_model=list[schemas.Tenant])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    List all tenants. Only Agency or Developer can access.
    """
    return db.query(Tenant).all()

@router.post("/{tenant_id}/suspend", response_model=schemas.Tenant)
def suspend_tenant(
    tenant_id: int,
    request: Request,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    Suspend a tenant and block all its users.
    """
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Tenant suspension disabled in public demo mode")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_suspended = True
    tenant.suspension_reason = reason
    from datetime import datetime
    tenant.suspended_at = datetime.utcnow()
    tenant.suspended_by = current_user.id
    db.commit()
    db.refresh(tenant)

    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="TENANT_SUSPEND",
        entity_type="tenant",
        entity_id=str(tenant_id),
        description=f"Suspended tenant {tenant.name}. Reason: {reason}",
        metadata={"reason": reason, "suspended_by": current_user.email}
    )

    return tenant

@router.post("/{tenant_id}/restore", response_model=schemas.Tenant)
def restore_tenant(
    tenant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    Restore access for a suspended tenant.
    """
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Tenant restoration disabled in public demo mode")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_suspended = False
    tenant.suspension_reason = None
    tenant.suspended_at = None
    tenant.suspended_by = None
    db.commit()
    db.refresh(tenant)

    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="TENANT_RESTORE",
        entity_type="tenant",
        entity_id=str(tenant_id),
        description=f"Restored tenant {tenant.name}"
    )

    return tenant
