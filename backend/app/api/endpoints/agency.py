from app.auth.models import User, Tenant
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.auth import models, schemas as auth_schemas
from app.projects import schemas as project_schemas
from app.services.agency_service import agency_service
from app.auth.roles import UserRole

router = APIRouter()

@router.get("/team", response_model=List[auth_schemas.AgencyTeam])
def get_agency_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    Get all tenants and their associated users.
    Only accessible by Agency super-administrators.
    """
    return agency_service.get_hierarchical_team(db)

@router.get("/projects", response_model=List[project_schemas.ProjectWithTenant])
def get_agency_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_agency_user)
):
    """
    Get all projects across all clients.
    Only accessible by Agency super-administrators.
    """
    return agency_service.get_all_projects(db)
