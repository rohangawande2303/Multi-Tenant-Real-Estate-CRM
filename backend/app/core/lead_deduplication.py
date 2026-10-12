from sqlalchemy.orm import Session
from app.models.lead import Lead
from app.models.lead_activity import LeadActivity
from datetime import datetime
from typing import Optional, Dict, Any

def find_duplicate(
    phone: str,
    project_id: int,
    tenant_id: int,
    db: Session
) -> Optional[Lead]:
    """
    Check if lead with same phone exists in same project for this tenant.
    """
    return db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.project_id == project_id,
        Lead.phone == phone,
        Lead.is_deleted == False
    ).first()

def merge_lead_data(
    existing_lead: Lead,
    new_data: Dict[str, Any],
    source_channel: str,
    db: Session
) -> Lead:
    """
    Merge new data into existing lead and log activity.
    """
    # 1. Update last inquiry info in custom_fields
    if existing_lead.custom_fields is None:
        existing_lead.custom_fields = {}
    
    existing_lead.custom_fields["last_inquiry_channel_name"] = source_channel
    existing_lead.custom_fields["last_inquiry_datetime"] = datetime.utcnow().isoformat()
    
    # 2. Merge custom_fields (don't overwrite existing keys)
    new_custom = new_data.get("custom_fields", {})
    if new_custom:
        for key, value in new_custom.items():
            if key not in existing_lead.custom_fields:
                existing_lead.custom_fields[key] = value
                
    # 3. Update timestamp
    existing_lead.updated_at = datetime.utcnow()
    
    # 4. Create Activity Log entry
    activity = LeadActivity(
        lead_id=existing_lead.id,
        activity_type="duplicate_detected",
        meta_data={
            "description": f"Duplicate lead received from {source_channel}",
            "source": source_channel,
            "duplicate_phone": existing_lead.phone,
            "merged_at": datetime.utcnow().isoformat()
        }
    )
    db.add(activity)
    
    db.commit()
    db.refresh(existing_lead)
    
    return existing_lead
