from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Integration(Base):
    """
    Integration Model
    -----------------
    Stores configuration for external lead sources (Meta, Google, etc.) 
    linked to a specific project.
    """
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(Integer, index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False) # Reference to project_id in tenant schema

    # Integration Details
    source_type = Column(String(100), nullable=False) # meta_ads, google_ads, website_form, etc.
    source_name = Column(String(255), nullable=False) # User-friendly name
    
    is_active = Column(Boolean, default=True)
    
    # Configuration (JSONB)
    config = Column(JSONB, default=dict)
    
    # Generated Webhook URL
    webhook_url = Column(Text, nullable=True)
    
    # Webhook Secret for signature verification
    webhook_secret = Column(String(255), nullable=True)
    
    # Statistics
    total_webhooks_received = Column(Integer, default=0)
    total_leads_created = Column(Integer, default=0)
    last_webhook_at = Column(DateTime(timezone=True), nullable=True)
    
    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True) # User ID

    __table_args__ = (
        {"schema": "public"} # Integrations are stored in public schema but scoped by tenant/project
    )
