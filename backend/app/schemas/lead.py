from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

class LeadBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    alternate_phone: Optional[str] = None
    project_id: int
    status: Optional[str] = "NEW"
    lead_score: Optional[int] = 0
    lead_rating: Optional[str] = None
    source_group: Optional[str] = None
    source_channel: Optional[str] = None
    source_sub_channel: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[str] = None
    budget_max: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    custom_fields: Optional[Dict[str, Any]] = {}

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    alternate_phone: Optional[str] = None
    status: Optional[str] = None
    lead_score: Optional[int] = None
    lead_rating: Optional[str] = None
    assigned_to: Optional[int] = None
    source_group: Optional[str] = None
    source_channel: Optional[str] = None
    source_sub_channel: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[str] = None
    budget_max: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    custom_fields: Optional[Dict[str, Any]] = None

class LeadCommentBase(BaseModel):
    content: str
    role: str

class LeadCommentCreate(LeadCommentBase):
    pass

class LeadCommentResponse(LeadCommentBase):
    id: int
    lead_id: UUID
    user_id: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeadResponse(LeadBase):
    id: UUID
    tenant_id: int
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    created_by: Optional[int] = None
    
    # Enterprise Metadata
    mandate_id: Optional[int] = None
    mandate_name: Optional[str] = None
    developer_id: Optional[str] = None
    project_name: Optional[str] = None
    first_sales_owner_email: Optional[str] = None
    current_status_at_sales: Optional[str] = None

    class Config:
        from_attributes = True

class LeadListResponse(BaseModel):
    total: int
    items: List[LeadResponse]
