from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class LeadActivity(Base):
    """
    Lead Activity Log
    -----------------
    Tracks changes and activities related to a lead.
    """
    __tablename__ = "lead_activity_logs"
    __table_args__ = {"schema": None}

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    activity_type = Column(String, index=True, nullable=False) # e.g., "CREATE", "UPDATE", "STATUS_CHANGE"
    
    # Store changes for audit trail
    field_name = Column(String, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    
    performed_by = Column(Integer, index=True, nullable=True) # User ID
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Optional JSON context for complex activities
    meta_data = Column(JSONB, default=dict)
