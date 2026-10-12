from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Lead(Base):
    """
    Lead Entity
    -----------
    Represents a potential customer. 
    Stored in the tenant-specific schema.
    """
    __tablename__ = "leads"
    
    # Core SQL Columns
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Scoping
    tenant_id = Column(Integer, index=True, nullable=False) # Copied from context for extra safety
    project_id = Column(Integer, index=True, nullable=False) # Linked to a specific project
    
    # Agency/Identity Persisted Metadata
    mandate_id = Column(Integer, index=True, nullable=True) # Public Tenant ID
    mandate_name = Column(String, index=True, nullable=True) # Public Tenant Name
    developer_id = Column(String, index=True, nullable=True) # Direct Client Developer ID
    project_name = Column(String, index=True, nullable=True) # Persisted to avoid expensive joins in export
    
    # Primary Searchable Identity
    name = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    email = Column(String, index=True, nullable=True)
    alternate_phone = Column(String, nullable=True)
    
    # Status & Assignment
    status = Column(String, index=True, default="NEW")
    current_status_at_sales = Column(String, index=True, nullable=True) # Specifically for sales tracking
    assigned_to = Column(Integer, index=True, nullable=True) # User ID
    first_sales_owner_email = Column(String, index=True, nullable=True) # Auto-populated from creator
    
    # Core Searchable Attributes
    lead_score = Column(Integer, default=0)
    lead_rating = Column(String, nullable=True)
    source_group = Column(String, index=True, nullable=True)
    source_channel = Column(String, nullable=True)
    source_sub_channel = Column(String, nullable=True)
    city = Column(String, index=True, nullable=True)
    budget_min = Column(String, nullable=True)
    budget_max = Column(String, nullable=True)
    
    # UTM Attribution
    utm_source = Column(String, index=True, nullable=True)
    utm_medium = Column(String, index=True, nullable=True)
    utm_campaign = Column(String, index=True, nullable=True)
    utm_term = Column(String, nullable=True)
    utm_content = Column(String, nullable=True)
    
    # Flexible Fields
    custom_fields = Column(JSONB, default=dict)
    
    # Meta
    is_deleted = Column(Boolean, default=False, index=True)
    follow_up_date = Column(DateTime(timezone=True), index=True, nullable=True) # For Ignored logic
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True)
    created_by = Column(Integer, nullable=True) # User ID

    # Multi-tenant scoping: schema=None ensures it goes into the tenant schema
    __table_args__ = (
        Index("idx_lead_phone_project", "phone", "project_id", unique=True),
        {"schema": None}
    )


class LeadComment(Base):
    """
    Lead Comment Entity
    -------------------
    Rich history of notes added by different roles (Call Center, Sales, etc.).
    """
    __tablename__ = "lead_comments"
    __table_args__ = {"schema": None}

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False) # Public User ID
    role = Column(String, index=True, nullable=False) # Role of the user at the time of comment
    content = Column(String, nullable=False)
    
    # Soft Delete & Audit
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
