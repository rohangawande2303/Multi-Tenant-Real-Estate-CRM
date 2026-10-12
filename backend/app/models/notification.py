from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Notification(Base):
    """
    Notification Entity
    -------------------
    Stores in-app notifications for users.
    Stored in 'public' schema for easy cross-tenant access by Agency Admins.
    """
    __tablename__ = "notifications"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True) # Target user, NULL if broadcast to all tenant admins
    tenant_id = Column(Integer, index=True, nullable=True) # Scoping
    
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, nullable=True) # e.g. USER_CREATED, PROJECT_CREATED
    link = Column(String, nullable=True) # URL to redirect on click
    
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
