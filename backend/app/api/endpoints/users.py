from app.auth.models import User, Tenant
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile

from app.core.database import get_db
from app.auth.models import User, Tenant
from app.auth import schemas, security
from app.api.deps import get_current_active_user
from app.auth.roles import UserRole

router = APIRouter()

from app.services.email_service import email_service

@router.post("/", response_model=schemas.User)
async def create_user(
    request: Request,
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new user.
    Agency/Agency Admin can create users in ANY tenant if they specify tenant_id.
    Client Admin can only create users in THEIR tenant.
    """
    is_agency_privileged = current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]
    is_client_admin = current_user.role == UserRole.CLIENT_ADMIN

    if not is_agency_privileged and not is_client_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create users"
        )
    
    # Target tenant: if agency, use user_in.tenant_id, if client admin, force current_user.tenant_id
    target_tenant_id = user_in.tenant_id if is_agency_privileged else current_user.tenant_id

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )

    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_password,
        role=user_in.role,
        tenant_id=target_tenant_id,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="CREATE_USER",
        entity_type="user",
        entity_id=str(db_user.id),
        description=f"Created user {db_user.email} (Role: {db_user.role}) in tenant {target_tenant_id}"
    )

    # Trigger invite email
    try:
        tenant_name = "Your CRM"
        tenant = db.query(Tenant).filter(Tenant.id == target_tenant_id).first()
        if tenant:
            tenant_name = tenant.name

        await email_service.send_invite_email(
            email=user_in.email,
            password=user_in.password,
            inviter_name=current_user.email,
            tenant_name=tenant_name
        )
    except Exception as e:
        print(f"Failed to send invite email: {e}")

    return db_user

@router.get("/", response_model=List[schemas.User])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List users.
    Agency/Agency Admin can see ALL users.
    Others see only their own tenant users.
    """
    if current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        return db.query(User).all()
    
    return db.query(User).filter(User.tenant_id == current_user.tenant_id).all()

@router.patch("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    request: Request,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a user.
    - Users can update their own profile (name, avatar).
    - Agency Admin can update ANY user.
    - Client Admin can update users in their tenant.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_self = current_user.id == user_id
    is_agency_privileged = current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]
    
    # NEW: Strict RBAC Isolation
    # If the target user is an Agency user, only another Agency user can modify them
    if db_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        if not is_agency_privileged:
            raise HTTPException(status_code=403, detail="Not authorized to modify Agency users")

    is_client_admin = current_user.role == UserRole.CLIENT_ADMIN and db_user.tenant_id == current_user.tenant_id

    if not is_self and not is_agency_privileged and not is_client_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")

    update_data = user_update.dict(exclude_unset=True)
    
    # Security: Non-privileged users shouldn't change roles or status
    if not is_agency_privileged and not is_client_admin:
        update_data.pop("role", None)
        update_data.pop("is_active", None)
        update_data.pop("email", None)
    
    # Security: CLIENT_ADMIN cannot elevate users to AGENCY roles
    if is_client_admin and not is_agency_privileged:
        if "role" in update_data and update_data["role"] in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
             raise HTTPException(status_code=403, detail="Client Admin cannot assign Agency roles")

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="UPDATE_USER",
        entity_type="user",
        entity_id=str(db_user.id),
        description=f"Updated user {db_user.email}. Fields: {list(update_data.keys())}"
    )

    return db_user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a user.
    Only Agency Admin or Client Admin (for their tenant) can delete users.
    """
    from app.core.config import settings
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="User deletion is disabled in public demo mode")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_agency_privileged = current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]
    is_client_admin = current_user.role == UserRole.CLIENT_ADMIN and db_user.tenant_id == current_user.tenant_id

    if not is_agency_privileged and not is_client_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete users")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user_email = db_user.email
    db.delete(db_user)
    db.commit()

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="DELETE_USER",
        entity_type="user",
        entity_id=str(user_id),
        description=f"Deleted user {user_email}"
    )

    return {"message": "User deleted successfully"}

@router.post("/me/avatar", response_model=schemas.User)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload an avatar image for the current user.
    """
    # 1. Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only jpg, png, and webp are allowed")

    # 2. Validate file size (5MB)
    max_size = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    await file.seek(0)

    # 3. Save file
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads", "avatars")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)

    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{current_user.id}_{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(uploads_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Update user record
    # Store the URL path, not the disk path
    avatar_url = f"/uploads/avatars/{filename}"
    
    old_avatar = current_user.avatar_url
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    # 5. Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="AVATAR_UPDATE",
        entity_type="user",
        entity_id=str(current_user.id),
        description=f"Updated avatar for {current_user.email}",
        metadata={"old_url": old_avatar, "new_url": avatar_url}
    )

    return current_user
