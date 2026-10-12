import time
from datetime import timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_db
from app.auth import schemas, security
from app.auth.models import User, Tenant
from app.api.deps import get_current_active_user
from app.core.config import settings
from app.services.activity_service import activity_service

router = APIRouter()

# In-memory tracker for failed login attempts: { email: [timestamp1, timestamp2, ...] }
_failed_login_tracker = defaultdict(list)

def check_login_lockout(email: str):
    email = email.lower().strip()
    now = time.time()
    cutoff = now - (settings.LOGIN_LOCKOUT_MINUTES * 60)
    recent_attempts = [ts for ts in _failed_login_tracker[email] if ts > cutoff]
    _failed_login_tracker[email] = recent_attempts
    if len(recent_attempts) >= settings.MAX_LOGIN_ATTEMPTS:
        remaining_seconds = int((recent_attempts[0] + (settings.LOGIN_LOCKOUT_MINUTES * 60)) - now)
        remaining_minutes = max(1, remaining_seconds // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Account temporarily locked for {remaining_minutes} more minute(s)."
        )

def record_failed_attempt(email: str):
    email = email.lower().strip()
    now = time.time()
    cutoff = now - (settings.LOGIN_LOCKOUT_MINUTES * 60)
    _failed_login_tracker[email] = [ts for ts in _failed_login_tracker[email] if ts > cutoff]
    _failed_login_tracker[email].append(now)

def clear_failed_attempts(email: str):
    email = email.lower().strip()
    _failed_login_tracker.pop(email, None)

@router.post("/login", response_model=schemas.Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Login endpoint with brute-force lockout protection.
    Authenticates against public.users table directly.
    """
    # 1. Check if account is currently locked out
    check_login_lockout(form_data.username)

    # 2. Find user in public schema
    user = db.query(User).filter(User.email == form_data.username.strip()).first()
    if not user:
        record_failed_attempt(form_data.username)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # 3. Verify password hash using bcrypt
    if not security.verify_password(form_data.password, user.hashed_password):
        record_failed_attempt(form_data.username)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 4. Successful login: reset failed attempts
    clear_failed_attempts(form_data.username)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id,
        "role": user.role
    }
    
    access_token = security.create_access_token(
        data=token_payload, expires_delta=access_token_expires
    )

    # Log the LOGIN event (fire and forget)
    try:
        ua = request.headers.get("user-agent", "")
        device = _parse_device(ua)
        activity_service.log_activity(
            db=db,
            user_id=user.id,
            request=request,
            tenant_id=user.tenant_id,
            role=user.role,
            action_type="LOGIN",
            entity_type="auth",
            description=f"{user.email} signed in from {device}",
            metadata={
                "email": user.email,
                "device": device,
                "user_agent": ua
            }
        )
    except Exception:
        pass

    try:
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=(settings.ENVIRONMENT == "production"),
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    except Exception:
        pass

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "tenant_id": user.tenant_id,
        "email": user.email
    }

def _parse_device(ua: str) -> str:
    """Extract a human-readable device/browser string from User-Agent."""
    if not ua:
        return "Unknown Device"
    ua_lower = ua.lower()
    if "edg/" in ua_lower:
        browser = "Edge"
    elif "chrome" in ua_lower and "safari" in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower:
        browser = "Safari"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
    else:
        browser = "Browser"
    if "windows" in ua_lower:
        os = "Windows"
    elif "android" in ua_lower:
        os = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os = "iOS"
    elif "mac os" in ua_lower:
        os = "macOS"
    elif "linux" in ua_lower:
        os = "Linux"
    else:
        os = "Unknown OS"
    return f"{browser} on {os}"

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Log logout activity and clear auth cookies."""
    try:
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=(settings.ENVIRONMENT == "production"),
            samesite="lax"
        )
    except Exception:
        pass

    try:
        activity_service.log_activity(
            db=db,
            user_id=current_user.id,
            request=request,
            tenant_id=current_user.tenant_id,
            role=current_user.role,
            action_type="LOGOUT",
            description=f"User {current_user.email} logged out"
        )
    except Exception:
        pass
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.User)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current logged in user details."""
    return current_user

@router.post("/register", response_model=schemas.User)
def register_agency(
    registration: schemas.AgencyRegistration,
    db: Session = Depends(get_db)
):
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Agency registration is disabled in public demo mode")

    if db.query(User).filter(User.email == registration.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    schema_name = registration.agency_name.lower().replace(" ", "_")
    if not schema_name.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Agency name contains invalid characters")

    if db.query(Tenant).filter(Tenant.schema_name == schema_name).first():
        raise HTTPException(status_code=400, detail="Agency name already taken")

    from app.services import tenant_service
    try:
        new_tenant = tenant_service.create_tenant_schema(
            db=db,
            tenant_name=registration.agency_name,
            schema_name=schema_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agency: {str(e)}")

    hashed_password = security.get_password_hash(registration.password)
    
    new_user = User(
        email=registration.email,
        hashed_password=hashed_password,
        role="AGENCY",
        tenant_id=new_tenant.id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
