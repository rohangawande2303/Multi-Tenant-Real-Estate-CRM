from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import pandas as pd
from datetime import datetime
from app.core.database import get_db
from app.auth.models import User, UserActivityLog
from app.auth import schemas
from app.api.deps import get_current_active_user
from app.auth.roles import UserRole

router = APIRouter()

@router.get("/", response_model=List[schemas.UserActivityLog])
def list_activity_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    project_id: Optional[int] = None, # New filter
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve activity logs. Immutable (Read-only).
    """
    query = db.query(UserActivityLog)

    # RBAC & Tenant Isolation
    if current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        # Agency: Can filter by any tenant
        if tenant_id:
            query = query.filter(UserActivityLog.tenant_id == tenant_id)
    else:
        # All others: Strictly limited to their own tenant
        query = query.filter(UserActivityLog.tenant_id == current_user.tenant_id)
        
        # Non-admins can only see their own logs
        if current_user.role != UserRole.CLIENT_ADMIN:
            query = query.filter(UserActivityLog.user_id == current_user.id)

    # Specific Filters
    if user_id:
        query = query.filter(UserActivityLog.user_id == user_id)
    if project_id:
        query = query.filter(UserActivityLog.project_id == project_id)
    if action_type:
        query = query.filter(UserActivityLog.action_type == action_type)
    if entity_type:
        query = query.filter(UserActivityLog.entity_type == entity_type)
    if start_date:
        query = query.filter(UserActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(UserActivityLog.created_at <= end_date)

    return query.order_by(UserActivityLog.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/export")
def export_activity_logs(
    user_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    project_id: Optional[int] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export activity logs to Excel.
    Respects the same filtering and RBAC as list_activity_logs.
    """
    query = db.query(UserActivityLog)

    # RBAC & Tenant Isolation
    if current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        if tenant_id:
            query = query.filter(UserActivityLog.tenant_id == tenant_id)
    else:
        query = query.filter(UserActivityLog.tenant_id == current_user.tenant_id)
        if current_user.role != UserRole.CLIENT_ADMIN:
            query = query.filter(UserActivityLog.user_id == current_user.id)

    # Specific Filters
    if user_id:
        query = query.filter(UserActivityLog.user_id == user_id)
    if project_id:
        query = query.filter(UserActivityLog.project_id == project_id)
    if action_type:
        query = query.filter(UserActivityLog.action_type == action_type)
    if entity_type:
        query = query.filter(UserActivityLog.entity_type == entity_type)
    if start_date:
        query = query.filter(UserActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(UserActivityLog.created_at <= end_date)

    logs = query.order_by(UserActivityLog.created_at.desc()).all()
    
    # Prepare data for pandas
    data = []
    for log in logs:
        meta = log.meta_data or {}
        data.append({
            "Date & Time": log.created_at.replace(tzinfo=None) if log.created_at else "",
            "Email": meta.get("email", ""),
            "User ID": log.user_id,
            "Role": log.role,
            "Action": log.action_type,
            "Description": log.description,
            "Device": meta.get("device", ""),
            "Browser / UA": meta.get("user_agent", log.user_agent or ""),
            "IP Address": log.ip_address,
            "Entity": log.entity_type,
            "Entity ID": log.entity_id,
            "Project ID": log.project_id,
            "Tenant ID": log.tenant_id,
            "Page URL": log.page_url
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Activity Logs')
    
    output.seek(0)
    
    filename = f"activity_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(
        output, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.post("/log", status_code=status.HTTP_201_CREATED)
async def create_frontend_log(
    request: Request,
    log_in: schemas.FrontendActivityLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Endpoint for frontend click tracking and UI events.
    """
    new_log = UserActivityLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type=log_in.action_type, # e.g. "CLICK", "PAGE_VIEW"
        project_id=log_in.project_id,
        entity_type=log_in.entity_type, 
        entity_id=log_in.entity_id,
        description=log_in.description,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        page_url=log_in.page_url,
        meta_data=log_in.meta_data
    )
    db.add(new_log)
    db.commit()
    return {"status": "logged"}

@router.get("/count")
def count_activity_logs(
    user_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    project_id: Optional[int] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Return total count of logs (used for pagination).
    """
    query = db.query(UserActivityLog)

    if current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        if tenant_id:
            query = query.filter(UserActivityLog.tenant_id == tenant_id)
    else:
        query = query.filter(UserActivityLog.tenant_id == current_user.tenant_id)
        if current_user.role != UserRole.CLIENT_ADMIN:
            query = query.filter(UserActivityLog.user_id == current_user.id)

    if user_id:
        query = query.filter(UserActivityLog.user_id == user_id)
    if project_id:
        query = query.filter(UserActivityLog.project_id == project_id)
    if action_type:
        query = query.filter(UserActivityLog.action_type == action_type)
    if entity_type:
        query = query.filter(UserActivityLog.entity_type == entity_type)
    if start_date:
        query = query.filter(UserActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(UserActivityLog.created_at <= end_date)

    return {"total": query.count()}
