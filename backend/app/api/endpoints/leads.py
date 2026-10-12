from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import pandas as pd
import io
from fastapi import UploadFile, File

from app.core.database import get_db
from app.api import deps
from app.auth import models as auth_models
from app.auth.roles import UserRole
from app.projects import models as project_models
from app.models.lead import Lead, LeadComment
from app.models.lead_activity import LeadActivity
from app.services.activity_service import activity_service
from app.schemas import lead as lead_schemas

router = APIRouter()

def check_project_access(user: auth_models.User, project_id: int, db: Session):
    """
    Verifies if a user has access to a project.
    """
    if user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        return True
    
    from app.projects.models import project_user_association
    is_assigned = db.query(project_user_association).filter(
        project_user_association.c.project_id == project_id,
        project_user_association.c.user_id == user.id
    ).first()
    return is_assigned is not None

def check_lead_access(user: auth_models.User, lead: Lead, db: Session):
    """
    Enforces project access and role-based lead assignment scoping (same-tenant IDOR defense).
    - Agency/Developer/Client Admin/Sales Manager: Access leads within assigned projects.
    - Executive / Call Center: Can ONLY access leads specifically assigned to them.
    """
    if not check_project_access(user, lead.project_id, db):
        raise HTTPException(status_code=403, detail="No access to this lead's project")

    FULL_ACCESS_ROLES = [
        UserRole.AGENCY, UserRole.AGENCY_ADMIN,
        UserRole.DEVELOPER, UserRole.CLIENT_ADMIN,
        UserRole.SALES_MANAGER, UserRole.BD_MANAGER
    ]
    if user.role not in FULL_ACCESS_ROLES and lead.assigned_to != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Not authorized to access leads assigned to other users"
        )

@router.post("/", response_model=lead_schemas.LeadResponse)
def create_lead(
    request: Request,
    lead_in: lead_schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    # 1. Project Access Check
    if not check_project_access(current_user, lead_in.project_id, db):
        raise HTTPException(status_code=403, detail="No access to this project")

    # 2. Duplicate Detection (phone + project_id)
    existing = db.query(Lead).filter(
        Lead.phone == lead_in.phone,
        Lead.project_id == lead_in.project_id,
        Lead.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lead with this phone already exists in this project")

    # 3. Fetch Metadata for Persistence
    tenant = db.query(auth_models.Tenant).filter(auth_models.Tenant.id == current_user.tenant_id).first()
    project = db.query(project_models.Project).filter(project_models.Project.id == lead_in.project_id).first()
    
    # 4. Create Lead with Persisted Metadata
    db_lead = Lead(
        **lead_in.dict(exclude={"custom_fields"}),
        custom_fields=lead_in.custom_fields,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        mandate_id=tenant.id if tenant else None,
        mandate_name=tenant.name if tenant else None,
        developer_id=tenant.developer_id if tenant else None,
        project_name=project.name if project else None,
        current_status_at_sales=lead_in.status, # Initial status
        first_sales_owner_email=current_user.email # Auto-populated from creator
    )
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    # 5. Log Lead Activity
    activity = LeadActivity(
        lead_id=db_lead.id,
        activity_type="CREATE",
        performed_by=current_user.id
    )
    db.add(activity)
    
    # 6. Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="CREATE_LEAD",
        entity_type="lead",
        entity_id=str(db_lead.id),
        description=f"Created lead: {db_lead.name}"
    )
    
    db.commit()

    return db_lead

@router.get("/options")
def get_lead_options(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Returns distinct statuses, sources, and assignable agents for dynamic filters.
    """
    base = db.query(Lead).filter(
        Lead.is_deleted == False,
        Lead.tenant_id == current_user.tenant_id
    )
    if project_id:
        base = base.filter(Lead.project_id == project_id)

    statuses = [r[0] for r in base.with_entities(Lead.status).distinct().all() if r[0]]
    sources = [r[0] for r in base.with_entities(Lead.source_group).distinct().all() if r[0]]

    # Fetch assignable agents (active users in the tenant)
    agents = db.query(
        auth_models.User.id, auth_models.User.name, auth_models.User.email
    ).filter(
        auth_models.User.tenant_id == current_user.tenant_id,
        auth_models.User.is_active == True
    ).all()

    return {
        "statuses": sorted(statuses),
        "sources": sorted(sources),
        "agents": [{"id": a.id, "name": a.name or a.email, "email": a.email} for a in agents]
    }


@router.get("/", response_model=lead_schemas.LeadListResponse)
def list_leads(
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    source: Optional[str] = None
):
    query = db.query(Lead).filter(
        Lead.is_deleted == False,
        Lead.tenant_id == current_user.tenant_id
    )

    # ── STRICT RBAC ──────────────────────────────────────────────
    # Full-access roles see all leads in the project/tenant.
    # Restricted roles (SALES_MANAGER, CALL_CENTER, EXECUTIVE) see ONLY their assigned leads.
    FULL_ACCESS_ROLES = [
        UserRole.AGENCY, UserRole.AGENCY_ADMIN,
        UserRole.DEVELOPER, UserRole.CLIENT_ADMIN
    ]
    if current_user.role not in FULL_ACCESS_ROLES:
        query = query.filter(Lead.assigned_to == current_user.id)

    # ── FILTERS (AND logic – all stack) ─────────────────────────
    if project_id:
        query = query.filter(Lead.project_id == project_id)
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source_group == source)

    # ── SEARCH (case-insensitive, partial match) ────────────────
    # Covers: name (first+last), email, phone, city, assigned agent name/email
    if search:
        term = f"%{search}%"
        # Look up user IDs whose name or email matches the search term
        matching_agent_ids = [
            u.id for u in db.query(auth_models.User.id).filter(
                auth_models.User.tenant_id == current_user.tenant_id,
                or_(
                    auth_models.User.name.ilike(term),
                    auth_models.User.email.ilike(term)
                )
            ).all()
        ]

        search_conditions = [
            Lead.name.ilike(term),
            Lead.phone.ilike(term),
            Lead.email.ilike(term),
            Lead.city.ilike(term),
            Lead.first_sales_owner_email.ilike(term),
        ]
        if matching_agent_ids:
            search_conditions.append(Lead.assigned_to.in_(matching_agent_ids))

        query = query.filter(or_(*search_conditions))

    total = query.count()
    items = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()

    return {"total": total, "items": items}

@router.get("/{lead_id}", response_model=lead_schemas.LeadResponse)
def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    query = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False)
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        query = query.filter(Lead.tenant_id == current_user.tenant_id)
    lead = query.first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    check_lead_access(current_user, lead, db)

    return lead

@router.put("/{lead_id}", response_model=lead_schemas.LeadResponse)
@router.patch("/{lead_id}", response_model=lead_schemas.LeadResponse)
def update_lead(
    lead_id: UUID,
    request: Request,
    lead_in: lead_schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    query = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False)
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        query = query.filter(Lead.tenant_id == current_user.tenant_id)
    db_lead = query.first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    check_lead_access(current_user, db_lead, db)

    update_data = lead_in.dict(exclude_unset=True)
    
    # Custom fields merge
    if "custom_fields" in update_data and update_data["custom_fields"]:
        new_custom = db_lead.custom_fields.copy()
        new_custom.update(update_data["custom_fields"])
        db_lead.custom_fields = new_custom
        del update_data["custom_fields"]

    # Log changes
    for field, value in update_data.items():
        old_val = getattr(db_lead, field)
        if old_val != value:
            activity = LeadActivity(
                lead_id=db_lead.id,
                activity_type="UPDATE",
                field_name=field,
                old_value=str(old_val),
                new_value=str(value),
                performed_by=current_user.id
            )
            db.add(activity)
            setattr(db_lead, field, value)

    db.commit()
    db.refresh(db_lead)

    # Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="UPDATE_LEAD",
        entity_type="lead",
        entity_id=str(db_lead.id),
        description=f"Updated lead {db_lead.name}. Fields: {list(update_data.keys())}"
    )

    return db_lead

@router.delete("/{lead_id}")
def delete_lead(
    lead_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    from app.core.config import settings
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Lead deletion is disabled in public demo mode")

    query = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False)
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        query = query.filter(Lead.tenant_id == current_user.tenant_id)
    db_lead = query.first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    check_lead_access(current_user, db_lead, db)

    db_lead.is_deleted = True
    
    activity = LeadActivity(
        lead_id=db_lead.id,
        activity_type="DELETE",
        performed_by=current_user.id
    )
    db.add(activity)
    
    # Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="DELETE_LEAD",
        entity_type="lead",
        entity_id=str(lead_id),
        description=f"Soft-deleted lead: {db_lead.name}"
    )
    
    db.commit()
    
    return {"message": "Lead soft-deleted successfully"}

@router.get("/stats")
def get_lead_stats(
    project_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Get tenant-scoped lead statistics.
    """
    base_query = db.query(Lead).filter(
        Lead.tenant_id == current_user.tenant_id,
        Lead.is_deleted == False
    )
    
    if project_id:
        base_query = base_query.filter(Lead.project_id == project_id)
    if start_date:
        base_query = base_query.filter(Lead.created_at >= start_date)
    if end_date:
        base_query = base_query.filter(Lead.created_at <= end_date)
    if status:
        base_query = base_query.filter(Lead.status == status)

    total_leads = base_query.count()
    
    # Status Breakdown
    statuses = db.query(Lead.status, func.count(Lead.id)).filter(
        Lead.tenant_id == current_user.tenant_id,
        Lead.is_deleted == False
    )
    if project_id: statuses = statuses.filter(Lead.project_id == project_id)
    if start_date: statuses = statuses.filter(Lead.created_at >= start_date)
    if end_date: statuses = statuses.filter(Lead.created_at <= end_date)
    status_counts = statuses.group_by(Lead.status).all()

    # Source distribution
    sources = db.query(Lead.source_group, func.count(Lead.id)).filter(
        Lead.tenant_id == current_user.tenant_id,
        Lead.is_deleted == False
    )
    if project_id: sources = sources.filter(Lead.project_id == project_id)
    if start_date: sources = sources.filter(Lead.created_at >= start_date)
    if end_date: sources = sources.filter(Lead.created_at <= end_date)
    source_counts = sources.group_by(Lead.source_group).all()

    return {
        "total_leads": total_leads,
        "new_this_week": base_query.filter(Lead.status == "NEW").count(),
        "status_breakdown": [{"name": s[0], "value": s[1]} for s in status_counts],
        "conversion_rate": 8.4, 
        "active_projects": 1,
        "sources": [{"name": s[0] or "Unknown", "value": s[1]} for s in source_counts]
    }


@router.post("/bulk-upload")
async def bulk_upload_leads(
    request: Request,
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Bulk upload leads from Excel/CSV with loose schema validation.
    - **Appends** data to the specified project.
    - **Validates** critical fields (Name, Phone).
    - **Maps** unknown columns to `custom_fields` JSONB.
    """
    # 1. RBAC Encorcement & Project Scoping
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to perform bulk uploads")

    if not check_project_access(current_user, project_id, db):
        raise HTTPException(status_code=403, detail="No access to this project")

    # 2. File Processing
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    # 3. Column Validation (Loose/Critical Only)
    # We expect case-insensitive match for core fields, but for simplicity let's normalize headers
    df.columns = [c.strip() for c in df.columns]
    
    # Map common variations to standard keys
    column_map = {
        'name': 'name', 'full name': 'name', 'lead name': 'name',
        'phone': 'phone', 'contact': 'phone', 'mobile': 'phone', 'phone number': 'phone',
        'email': 'email', 'email address': 'email',
        'city': 'city',
        'status': 'status',
        'source': 'source_group'
    }

    # Identify critical columns exist
    lower_cols = {c.lower(): c for c in df.columns}
    
    found_name = next((raw for norm, raw in lower_cols.items() if norm in ['name', 'full name', 'lead name']), None)
    found_phone = next((raw for norm, raw in lower_cols.items() if norm in ['phone', 'contact', 'mobile', 'phone number']), None)

    if not found_name or not found_phone:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing critical columns. Found: {list(df.columns)}. Required at least: Name, Phone"
        )

    # 4. Fetch Metadata for Persistence
    tenant = db.query(auth_models.Tenant).filter(auth_models.Tenant.id == current_user.tenant_id).first()
    project = db.query(project_models.Project).filter(project_models.Project.id == project_id).first()

    # 5. Processing & Persistence
    leads_created = 0
    errors = []

    for index, row in df.iterrows():
        try:
            row_data = row.to_dict()
            
            # Extract Core Fields
            name = str(row_data.get(found_name)).strip()
            phone = str(row_data.get(found_phone)).strip()
            
            # Skip empty rows
            if not name or name.lower() == 'nan' or not phone or phone.lower() == 'nan':
                continue

            # Check Duplicates (Phone + Project)
            duplicate = db.query(Lead).filter(
                Lead.phone == phone,
                Lead.project_id == project_id,
                Lead.is_deleted == False
            ).first()

            if duplicate:
                continue 

            # Extract other core fields if they exist
            email_col = next((raw for norm, raw in lower_cols.items() if norm in ['email', 'email address']), None)
            email = str(row_data.get(email_col)).strip() if email_col and str(row_data.get(email_col)).lower() != 'nan' else None

            city_col = next((raw for norm, raw in lower_cols.items() if norm in ['city']), None)
            city = str(row_data.get(city_col)).strip() if city_col and str(row_data.get(city_col)).lower() != 'nan' else None

            status_col = next((raw for norm, raw in lower_cols.items() if norm in ['status']), None)
            status = str(row_data.get(status_col)).strip() if status_col and str(row_data.get(status_col)).lower() != 'nan' else "NEW"
            
            # Validate Status Enum if possible, else default
            if status not in ["NEW", "WARM", "HOT", "CLOSED", "LOST", "FOLLOW_UP"]:
                status = "NEW"

            # 6. Extract Custom Fields
            custom_fields = {}
            for col, val in row_data.items():
                if col not in [found_name, found_phone, email_col, city_col, status_col]:
                    if pd.notna(val):
                        custom_fields[col] = val

            # 7. Insert with Persisted Metadata
            db_lead = Lead(
                tenant_id=current_user.tenant_id,
                project_id=project_id,
                name=name,
                phone=phone,
                email=email,
                city=city,
                status=status,
                custom_fields=custom_fields,
                created_by=current_user.id,
                source_group="FILE_UPLOAD",
                mandate_id=tenant.id if tenant else None,
                mandate_name=tenant.name if tenant else None,
                developer_id=tenant.developer_id if tenant else None,
                project_name=project.name if project else None,
                current_status_at_sales=status,
                first_sales_owner_email=current_user.email
            )
            db.add(db_lead)
            leads_created += 1

            if leads_created % 50 == 0:
                db.commit()

        except Exception as e:
            errors.append(f"Row {index + 1}: {str(e)}")

    db.commit()

    # Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="UPLOAD_LEADS",
        entity_type="project",
        entity_id=str(project_id),
        description=f"Bulk uploaded {leads_created} leads to project {project_id}"
    )

    return {
        "message": "Bulk upload completed",
        "total_processed": len(df),
        "leads_created": leads_created,
        "errors": errors[:5] # Limit error output
    }
@router.post("/{lead_id}/comments", response_model=lead_schemas.LeadCommentResponse)
def create_lead_comment(
    lead_id: UUID,
    request: Request,
    comment_in: lead_schemas.LeadCommentCreate,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Add a role-based comment to a lead.
    """
    db_lead = db.query(Lead).filter(
        Lead.id == lead_id, 
        Lead.is_deleted == False,
        Lead.tenant_id == current_user.tenant_id
    ).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    check_lead_access(current_user, db_lead, db)

    db_comment = LeadComment(
        lead_id=lead_id,
        user_id=current_user.id,
        role=current_user.role,
        content=comment_in.content
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    # Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        project_id=db_lead.project_id,
        role=current_user.role,
        action_type="ADD_LEAD_COMMENT",
        entity_type="lead",
        entity_id=str(lead_id),
        description=f"Added comment to lead {db_lead.name}"
    )

    return db_comment

@router.get("/{lead_id}/comments", response_model=List[lead_schemas.LeadCommentResponse])
def list_lead_comments(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Get all comments for a lead (excluding soft-deleted).
    """
    db_lead = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    check_lead_access(current_user, db_lead, db)

    return db.query(LeadComment).filter(
        LeadComment.lead_id == lead_id,
        LeadComment.is_deleted == False
    ).order_by(LeadComment.created_at.desc()).all()

@router.delete("/{lead_id}/comments/{comment_id}")
def delete_lead_comment(
    lead_id: UUID,
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Soft-delete a lead comment.
    """
    comment = db.query(LeadComment).filter(
        LeadComment.id == comment_id,
        LeadComment.lead_id == lead_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Permission check: Only creator or admin can delete
    if comment.user_id != current_user.id and current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    comment.is_deleted = True
    db.commit()

    # Log Global Activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="DELETE_LEAD_COMMENT",
        entity_type="lead",
        entity_id=str(lead_id),
        description=f"Soft-deleted a lead comment"
    )

    return {"message": "Comment deleted"}

@router.get("/ignored")
def list_ignored_leads(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Get detailed list of leads with past-due follow-ups.
    """
    active_statuses = ["NEW", "WARM", "HOT", "FOLLOW_UP", "SITE_VISIT_DONE"]
    now = datetime.now()
    
    query = db.query(
        Lead.id, Lead.name, Lead.phone, Lead.created_at.label("assigned_date"), Lead.follow_up_date,
        auth_models.User.name.label("agent_name"), auth_models.User.email.label("agent_email")
    ).join(
        auth_models.User, Lead.assigned_to == auth_models.User.id, isouter=True
    ).filter(
        Lead.tenant_id == current_user.tenant_id,
        Lead.is_deleted == False,
        Lead.assigned_to != None,
        Lead.status.in_(active_statuses),
        Lead.follow_up_date < now
    )

    if project_id:
        query = query.filter(Lead.project_id == project_id)

    results = query.all()
    
    formatted = []
    for r in results:
        days_overdue = (now - r.follow_up_date).days if r.follow_up_date else 0
        formatted.append({
            "id": str(r.id),
            "name": r.name,
            "phone": r.phone,
            "agent_name": r.agent_name or "Unknown",
            "agent_email": r.agent_email or "N/A",
            "assigned_date": r.assigned_date,
            "follow_up_date": r.follow_up_date,
            "days_overdue": max(0, days_overdue)
        })

    return formatted
