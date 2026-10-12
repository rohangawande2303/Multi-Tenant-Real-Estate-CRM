from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class WebhookLog(Base):
    """
    WebhookLog Model
    ----------------
    Logs every incoming webhook request for auditing and debugging.
    """
    __tablename__ = "webhook_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    integration_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    tenant_id = Column(Integer, index=True, nullable=False)
    
    # Request Details
    source_type = Column(String(100), index=True)
    request_method = Column(String(10))
    request_headers = Column(JSONB, default=dict)
    request_body = Column(JSONB, default=dict)
    request_ip = Column(String(45))
    
    # Response Details
    response_status = Column(Integer, index=True) # 200, 400, 500
    
    # Result
    lead_created = Column(Boolean, default=False)
    lead_id = Column(UUID(as_uuid=True), nullable=True)
    is_duplicate = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    
    # Performance
    processing_time_ms = Column(Integer)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        {"schema": "public"} # Webhook logs are stored in public schema
    )
