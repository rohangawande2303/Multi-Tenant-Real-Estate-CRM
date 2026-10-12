"""
Project Management Endpoints
-----------------------------
Handles CRUD operations for Projects within a Multi-Tenant CRM.

Key Features:
- Role-based access control (Agency/Developer can create, Sales Manager sees assigned only)
- Projects are scoped to tenant schemas (e.g., agency_one.projects, agency_two.projects)
- Schema switching is handled automatically by TenantMiddleware + get_db()
"""


from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.models import User
from app.projects import models as project_models, schemas
from app.api import deps
from app.api.deps import get_current_active_user
from app.auth.roles import UserRole

router = APIRouter()

@router.post("/", response_model=schemas.Project)
def create_project(
    request: Request,
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new Project in the current tenant's schema.
    
    Authorization:
    - Only AGENCY and DEVELOPER roles can create projects
    - SALES_MANAGER and below cannot create projects
    
    Multi-Tenancy:
    - The project is created in the schema determined by X-Tenant-ID header
    - Example: If X-Tenant-ID = "agency_one", project goes to agency_one.projects
    
    Args:
        project: Project data (name, description, location, etc.)
        db: Database session (with schema already set by get_db())
        current_user: Authenticated user from JWT token
    
    Returns:
        The newly created Project object
    
    Raises:
        HTTPException 403: If user lacks permission to create projects
    """
    
    # Authorization Check: AGENCY, AGENCY_ADMIN, DEVELOPER, CLIENT_ADMIN can create projects
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to create projects"
        )
    
    # Create the Project instance from the request data
    # CRITICAL: Strip tenant_id from the data - Project model has no tenant_id column
    # Projects are tenant-scoped via PostgreSQL schema (set by middleware), not by column
    project_data = project.dict(exclude={"tenant_id"})
    db_project = project_models.Project(**project_data)
    
    # Add to the session (stages the INSERT operation)
    db.add(db_project)
    
    # Commit to the database (executes the INSERT in the correct tenant schema)
    db.commit()
    
    # Refresh the object to ensure all fields are loaded from the database
    db.refresh(db_project)
    
    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="CREATE_PROJECT",
        entity_type="project",
        entity_id=str(db_project.id),
        description=f"Created project: {db_project.name}"
    )

    return db_project


@router.get("/", response_model=List[schemas.Project])
def read_projects(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve Projects based on user role and tenant context.
    
    Access Control Logic:
    - AGENCY & DEVELOPER: See all projects in their tenant schema
    - SALES_MANAGER & EXECUTIVE: See only projects assigned to them
    - CALL_CENTER: No access (403)
    """
    
    # Role-Based Filtering
    if current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        # Agency, Admin, Developer, Client Admin can see all projects in their tenant
        return db.query(project_models.Project).offset(skip).limit(limit).all()
    elif current_user.role in [UserRole.SALES_MANAGER, UserRole.BD_MANAGER, UserRole.EXECUTIVE]:
        # Sales Managers, BD Managers, and Executives can only see projects they're assigned to
        return (
            db.query(project_models.Project)
            .join(
                project_models.project_user_association,
                project_models.Project.id == project_models.project_user_association.c.project_id
            )
            .filter(project_models.project_user_association.c.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        # All other roles (e.g. CALL_CENTER) are denied access
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view projects"
        )


@router.get("/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve a single project by ID.
    Enforces that:
    - CALL_CENTER users are completely forbidden (HTTP 403).
    - Unassigned EXECUTIVE or SALES_MANAGER users are forbidden (HTTP 403).
    - AGENCY / DEVELOPER / CLIENT_ADMIN have full access within their tenant scope.
    """
    if current_user.role == UserRole.CALL_CENTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Call center agents are not authorized to view projects"
        )
    return deps.validate_project_access(project_id, db, current_user)


@router.post("/{project_id}/assign")
def assign_project_users(
    project_id: int,
    request: Request,
    assignment: schemas.ProjectAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Assign users to a project.
    Only Agency and Developer roles can assign users.
    """
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to assign projects"
        )
    
    project = db.query(project_models.Project).filter(project_models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all users to assign
    users_to_assign = db.query(User).filter(User.id.in_(assignment.user_ids)).all()
    
    project.users = users_to_assign
    db.commit()
    db.refresh(project)

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="ASSIGN_PROJECT_USERS",
        entity_type="project",
        entity_id=str(project_id),
        description=f"Assigned users {assignment.user_ids} to project: {project.name}"
    )
    return {"message": "Project assigned successfully"}

@router.patch("/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: int,
    request: Request,
    project_update: schemas.ProjectBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a project's details.
    """
    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_project = db.query(project_models.Project).filter(project_models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.dict(exclude_unset=True)
    old_data = {field: getattr(db_project, field) for field in update_data.keys()}
    
    for field, value in update_data.items():
        setattr(db_project, field, value)

    db.commit()
    db.refresh(db_project)

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="UPDATE_PROJECT",
        entity_type="project",
        entity_id=str(project_id),
        description=f"Updated project: {db_project.name}",
        metadata={"old": old_data, "new": update_data}
    )

    return db_project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a project.
    """
    from app.core.config import settings
    if settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Project deletion is disabled in public demo mode")

    if current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_project = db.query(project_models.Project).filter(project_models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = db_project.name
    db.delete(db_project)
    db.commit()

    # Log activity
    from app.services.activity_service import activity_service
    activity_service.log_activity(
        db=db,
        user_id=current_user.id,
        request=request,
        tenant_id=current_user.tenant_id,
        role=current_user.role,
        action_type="DELETE_PROJECT",
        entity_type="project",
        entity_id=str(project_id),
        description=f"Deleted project: {project_name}"
    )

    return {"message": "Project deleted successfully"}