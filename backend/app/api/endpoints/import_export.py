from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import pandas as pd
import io
import csv
from datetime import datetime

from app.core.database import get_db
from app.api import deps
from app.auth import models as auth_models
from app.auth.roles import UserRole
from app.models.lead import Lead
from app.projects.models import Project
from app.services.import_service import ImportService
from app.schemas.lead_upload_columns import (
    LEAD_UPLOAD_COLUMNS, 
    HIDDEN_FOR_BD_MANAGER, 
    SALES_RELEVANT_COLUMNS, 
    CC_RELEVANT_COLUMNS
)

router = APIRouter()

def sanitize_csv_cell(val: Any) -> Any:
    """
    Prevent CSV / Excel Formula Injection (CSV Injection).
    Prefixes values starting with '=', '+', '-', '@', tab or CR with a single quote.
    """
    if val is None:
        return ""
    if isinstance(val, str) and len(val) > 0:
        if val[0] in ('=', '+', '-', '@', '\t', '\r'):
            return "'" + val
    return val

def get_visible_columns(role: UserRole) -> List[str]:
    """
    Returns the list of columns visible to the specific role.
    """
    if role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        return LEAD_UPLOAD_COLUMNS
    elif role == UserRole.SALES_MANAGER:
        return [c for c in LEAD_UPLOAD_COLUMNS if c not in HIDDEN_FOR_BD_MANAGER]
    elif role == UserRole.EXECUTIVE:
        return [c for c in LEAD_UPLOAD_COLUMNS if c in SALES_RELEVANT_COLUMNS]
    elif role == UserRole.CALL_CENTER:
        return [c for c in LEAD_UPLOAD_COLUMNS if c in CC_RELEVANT_COLUMNS]
    else:
        return SALES_RELEVANT_COLUMNS

@router.get("/template")
def download_template(
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Downloads the strict CSV template (Empty file with headers).
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(LEAD_UPLOAD_COLUMNS)
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="lead_import_template_216_columns.csv"'
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

import os

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".xlsx", ".csv"}
ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
    "application/octet-stream"
}

async def validate_uploaded_file(file: UploadFile):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Only .xlsx and .csv files are supported."
        )

    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{content_type}'. Must be a valid CSV or Excel spreadsheet."
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 10MB (size: {len(content) / (1024*1024):.2f}MB)."
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )
    await file.seek(0)

@router.post("/import/preview")
async def preview_import(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Analyzes the file and returns stats: Total, Duplicates, Errors.
    Does NOT insert into DB.
    """
    deps.validate_project_access(project_id, db, current_user)
    await validate_uploaded_file(file)
    return await ImportService.preview_import(db, file, project_id)

@router.post("/import/execute")
async def execute_import(
    request: Request,
    project_id: int,
    file: UploadFile = File(...),
    duplicate_strategy: str = Query("SKIP", enum=["SKIP", "UPDATE", "CREATE_NEW"]),
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Executes the import with the chosen strategy.
    """
    deps.validate_project_access(project_id, db, current_user)
    await validate_uploaded_file(file)
    return await ImportService.execute_import(
        db, 
        file, 
        project_id, 
        current_user.id, 
        current_user.tenant_id,
        duplicate_strategy,
        request=request
    )

@router.get("/{project_id}/export")
def export_leads(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Exports leads to CSV with role-based column filtering and formula injection protection.
    """
    deps.validate_project_access(project_id, db, current_user)

    # 1. Fetch leads scoped to project
    query = db.query(Lead).filter(Lead.project_id == project_id, Lead.is_deleted == False)
    if current_user.role in [auth_models.UserRole.EXECUTIVE, auth_models.UserRole.CALL_CENTER]:
        query = query.filter(Lead.assigned_to == current_user.id)
    leads = query.all()
    
    # 2. Determine visible columns
    visible_columns = get_visible_columns(current_user.role)
    
    # 3. Prepare rows with formula injection sanitization
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=visible_columns)
    writer.writeheader()
    
    for lead in leads:
        row_data = {}
        cf = lead.custom_fields or {}
        
        for col in visible_columns:
            val = ""
            
            # 1. Map Core DB Fields
            if col == "Lead Id":
                val = str(lead.id)
            elif col == "Name":
                val = lead.name
            elif col == "Phone":
                val = lead.phone
            elif col == "Email":
                val = lead.email
            elif col == "Lead Created Date":
                val = lead.created_at.strftime("%Y-%m-%d") if lead.created_at else ""
            elif col == "Lead Created Time":
                val = lead.created_at.strftime("%H:%M:%S") if lead.created_at else ""
            elif col == "Current Project Id":
                val = str(lead.project_id)
            elif col == "Current Project Name":
                val = lead.project_name
            elif col == "Lead Rating":
                val = lead.lead_rating
            elif col == "Current Status At Sales":
                val = lead.current_status_at_sales
            elif col == "Mandate Id":
                val = str(lead.mandate_id) if lead.mandate_id else ""
            elif col == "Mandate Name":
                val = lead.mandate_name
            elif col == "First Sales Owner Email":
                val = lead.first_sales_owner_email
            
            # 2. Fallback to Custom Fields
            if not val and col in cf:
                val = cf[col]
            
            # Sanitize every cell to prevent CSV formula injection
            row_data[col] = sanitize_csv_cell(val)
            
        writer.writerow(row_data)
        
    output.seek(0)
    filename = f"leads_export_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/columns")
def get_columns(
    current_user: auth_models.User = Depends(deps.get_current_active_user)
):
    """
    Returns the list of columns visible to the current user.
    Used by Frontend to render the table.
    """
    return get_visible_columns(current_user.role)
