from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.auth.models import User
from app.auth import schemas
from app.core import context
from app.projects.models import Project, project_user_association
from app.auth.roles import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check Bearer token first, then fallback to secure HttpOnly cookie
    raw_token = token or request.cookies.get("access_token")
    if not raw_token:
        raise credentials_exception

    try:
        payload = jwt.decode(raw_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception 
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_agency_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Dependency to enforce agency super-admin privileges:
    1. Role must be AGENCY, AGENCY_ADMIN, or DEVELOPER.
    2. In production, an empty AGENCY_EMAILS must fail or deny agency access.
    """
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency super-administrator privileges required"
        )
    
    if settings.ENVIRONMENT == "production":
        if not settings.AGENCY_EMAILS or current_user.email.lower() not in settings.AGENCY_EMAILS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not authorized in production AGENCY_EMAILS whitelist"
            )
    else:
        if settings.AGENCY_EMAILS and current_user.email.lower() not in settings.AGENCY_EMAILS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not authorized in AGENCY_EMAILS whitelist"
            )
            
    return current_user

def validate_project_access(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Project:
    """
    Dependency to validate project access and enforce tenant isolation.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # AGENCY role can bypass tenant check (to manage all projects)
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        # For all other roles, the project MUST belong to their tenant
        # Since Project is in the tenant schema, if it's found, it's already isolated.
        # Check if the user is assigned to this project if they are not CLIENT_ADMIN
        if current_user.role != UserRole.CLIENT_ADMIN:
            is_assigned = db.query(project_user_association).filter(
                project_user_association.c.project_id == project_id,
                project_user_association.c.user_id == current_user.id
            ).first()
            if not is_assigned:
                raise HTTPException(status_code=403, detail="Not assigned to this project")
                
    return project
