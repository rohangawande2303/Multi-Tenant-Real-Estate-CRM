from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime
import io
import pandas as pd
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.auth.models import User, UserActivityLog
from app.api.deps import get_current_active_user, validate_project_access
from app.auth.roles import UserRole
from app.models.lead import Lead, LeadComment
from app.projects.models import Project, project_user_association

router = APIRouter()

@router.get("/audit", response_model=Dict[str, Any])
def get_dashboard_audit(
    project_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get consolidated high-level audit metrics for the dashboard.
    Designed for Executive / Agency / Admin roles.
    """
    
    # 1. Base Filters
    # Tenant Isolation
    tenant_filter = (Lead.tenant_id == current_user.tenant_id)
    
    # Project Isolation
    project_filter = True
    if project_id:
        # Validate Access first
        validate_project_access(project_id, db, current_user)
        project_filter = (Lead.project_id == project_id)
    elif current_user.role not in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER, UserRole.CLIENT_ADMIN]:
        # Limit to assigned projects
        try:
            assigned_proj_rows = (
                db.query(project_user_association.c.project_id)
                .filter(project_user_association.c.user_id == current_user.id)
                .all()
            )
            assigned_ids = [r[0] for r in assigned_proj_rows]
            project_filter = Lead.project_id.in_(assigned_ids) if assigned_ids else False
        except Exception:
            project_filter = False # No access

    # Date Filter
    date_filter = True
    if start_date:
        date_filter = (Lead.created_at >= start_date)
    if end_date:
        date_filter = (Lead.created_at <= end_date) & date_filter

    # Role-based assignment filter (Executive / Call Center see assigned leads only)
    assignment_filter = True
    if current_user.role in [UserRole.EXECUTIVE, UserRole.CALL_CENTER]:
        assignment_filter = (Lead.assigned_to == current_user.id)

    # 2. Aggregations
    
    # Lead Status Distribution
    status_stats = db.query(
        Lead.status, func.count(Lead.id)
    ).filter(
        tenant_filter, project_filter, date_filter, assignment_filter, Lead.is_deleted == False
    ).group_by(Lead.status).all()
    
    # Lead Source Distribution
    source_stats = db.query(
        Lead.source_group, func.count(Lead.id)
    ).filter(
        tenant_filter, project_filter, date_filter, assignment_filter, Lead.is_deleted == False
    ).group_by(Lead.source_group).all()

    # Recent Activity (Logs)
    # Re-apply filters for logs
    log_tenant_filter = (UserActivityLog.tenant_id == current_user.tenant_id)
    log_project_filter = True
    if project_id:
         log_project_filter = (UserActivityLog.project_id == project_id)
    
    log_date_filter = True
    if start_date:
        log_date_filter = (UserActivityLog.created_at >= start_date)
    if end_date:
        log_date_filter = (UserActivityLog.created_at <= end_date) & log_date_filter

    recent_logs = db.query(UserActivityLog).filter(
        log_tenant_filter, log_project_filter, log_date_filter
    ).order_by(desc(UserActivityLog.created_at)).limit(10).all()

    formatted_logs = [
        {
            "id": str(log.id),
            "action": log.action_type,
            "description": log.description,
            "user": log.role, # Or fetch user name join if needed, keeping simple for perf
            "date": log.created_at
        }
        for log in recent_logs
    ]

    return {
        "lead_status_distribution": [{"name": s[0], "value": s[1]} for s in status_stats],
        "lead_source_distribution": [{"name": s[0] or "Direct", "value": s[1]} for s in source_stats],
        "recent_activity": formatted_logs,
        "total_leads_period": sum([s[1] for s in status_stats])
    }

@router.get("/audit/export")
def export_dashboard_audit(
    project_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export the Audit Data to Excel
    """
    data = get_dashboard_audit(project_id, start_date, end_date, db, current_user)
    
    # Create multiple sheets
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Sheet 1: Summary
        summary_data = [
            {"Metric": "Total Leads", "Value": data["total_leads_period"]},
            {"Metric": "Period Start", "Value": start_date or "All Time"},
            {"Metric": "Period End", "Value": end_date or "Now"},
            {"Metric": "Project ID", "Value": project_id or "All"},
        ]
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
        
        # Sheet 2: Status Breakdown
        pd.DataFrame(data["lead_status_distribution"]).to_excel(writer, sheet_name='Lead Status', index=False)
        
        # Sheet 3: Source Breakdown
        pd.DataFrame(data["lead_source_distribution"]).to_excel(writer, sheet_name='Lead Sources', index=False)
        
        # Sheet 4: Recent Activity
        pd.DataFrame(data["recent_activity"]).to_excel(writer, sheet_name='Recent Activity', index=False)

    output.seek(0)
    filename = f"audit_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    
    return StreamingResponse(
        output, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.get("/overview", response_model=Dict[str, Any])
def get_dashboard_overview(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Optimized dashboard overview with real-time stats, role-bases filtering, and tenant security.
    """
    # 1. Base Filters & Access Control
    tenant_filter = (Lead.tenant_id == current_user.tenant_id)
    
    # Agency vs Client Logic
    is_agency = current_user.role in [UserRole.AGENCY, UserRole.AGENCY_ADMIN, UserRole.DEVELOPER]
    
    project_filter = True
    if project_id:
        validate_project_access(project_id, db, current_user)
        project_filter = (Lead.project_id == project_id)
    elif not is_agency:
        # Client - default to their first project if none specified
        client_projects = db.query(Project).all() # Tenant isolation is handled by search_path
        if client_projects:
            project_id = client_projects[0].id
            project_filter = (Lead.project_id == project_id)
        else:
            project_filter = False # No access if no projects

    # Role-based assignment filter (Executive / Call Center see assigned leads only)
    assignment_filter = True
    if current_user.role in [UserRole.EXECUTIVE, UserRole.CALL_CENTER]:
        assignment_filter = (Lead.assigned_to == current_user.id)

    # 2. Aggregated Statistics (Single Optimized Queries)
    
    # Lead Flow Overview (Grouped by Source)
    # Target Sources: Digital, Offline, Direct Walkins, Referral, Channel Partners
    source_stats = db.query(
        Lead.source_group,
        func.count(Lead.id).label("received"),
        func.count(Lead.id).filter(Lead.status == "SITE_VISIT_DONE").label("site_visit"),
        func.count(Lead.id).filter(Lead.status == "BOOKING_DONE").label("booking"),
        func.count(Lead.id).filter(Lead.status == "LOST").label("failed"),
        func.count(Lead.id).filter(Lead.status == "INVALID").label("junk")
    ).filter(
        tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False
    ).group_by(Lead.source_group).all()

    formatted_lead_flow = []
    for s in source_stats:
        received = s.received
        formatted_lead_flow.append({
            "source": s.source_group or "Other",
            "received": received,
            "site_visit_pct": round((s.site_visit / received * 100), 1) if received > 0 else 0,
            "booking_pct": round((s.booking / received * 100), 1) if received > 0 else 0,
            "failed_pct": round((s.failed / received * 100), 1) if received > 0 else 0,
            "junk_pct": round((s.junk / received * 100), 1) if received > 0 else 0
        })

    # 3. Fresh / WIP / Ignored Box Logic
    now = datetime.now()
    
    # Fresh Leads: NOT assigned to any agent (agency / manager sees these; restricted roles see 0)
    fresh_count = 0
    if current_user.role not in [UserRole.EXECUTIVE, UserRole.CALL_CENTER]:
        fresh_count = db.query(func.count(Lead.id)).filter(
            tenant_filter, project_filter, Lead.is_deleted == False,
            Lead.assigned_to == None
        ).scalar() or 0

    # WIP Leads: ARE assigned to an agent, still active (not closed/lost/junk)
    active_statuses = ["NEW", "WARM", "HOT", "FOLLOW_UP", "SITE_VISIT_DONE"]
    wip_count = db.query(func.count(Lead.id)).filter(
        tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False,
        Lead.assigned_to != None,
        Lead.status.in_(active_statuses)
    ).scalar() or 0

    # Ignored (Inside WIP): Assigned, active status, but follow-up date has passed
    ignored_count = db.query(func.count(Lead.id)).filter(
        tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False,
        Lead.assigned_to != None,
        Lead.status.in_(active_statuses),
        Lead.follow_up_date < now
    ).scalar() or 0

    # 4. Lead Activity (Today / Week / Month)
    from datetime import timedelta
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    def get_activity_counts(start_date: datetime):
        return {
            "site_visits": db.query(func.count(Lead.id)).filter(
                tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False,
                Lead.status == "SITE_VISIT_DONE",
                Lead.updated_at >= start_date
            ).scalar() or 0,
            "revisits": db.query(func.count(Lead.id)).filter(
                tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False,
                Lead.status == "REVISIT_DONE",
                Lead.updated_at >= start_date
            ).scalar() or 0,
            "followups": db.query(func.count(Lead.id)).filter(
                tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False,
                Lead.status == "FOLLOW_UP",
                Lead.updated_at >= start_date
            ).scalar() or 0
        }

    return {
        "lead_flow": formatted_lead_flow,
        "fresh_count": fresh_count or 0,
        "wip_count": wip_count or 0,
        "ignored_count": ignored_count or 0,
        "activity": {
            "today": get_activity_counts(today_start),
            "week": get_activity_counts(week_start),
            "month": get_activity_counts(month_start),
            "total": get_activity_counts(datetime(2000, 1, 1))
        },
        "total_leads": db.query(func.count(Lead.id)).filter(tenant_filter, project_filter, assignment_filter, Lead.is_deleted == False).scalar() or 0
    }
