from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class LeadCallLog(Base):
    """
    Lead Call Log
    -------------
    Tracks call attempts and telecalling dispositions.
    """
    __tablename__ = "lead_call_logs"
    __table_args__ = {"schema": None}

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    
    call_status = Column(String, index=True) # e.g., "CONNECTED", "NO_ANSWER", "BUSY"
    duration = Column(Integer, default=0) # In seconds
    attempt_number = Column(Integer, default=1)
    
    recording_url = Column(String, nullable=True)
    disposition = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)
    
    performed_by = Column(Integer, index=True, nullable=True) # User ID (Executive)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
