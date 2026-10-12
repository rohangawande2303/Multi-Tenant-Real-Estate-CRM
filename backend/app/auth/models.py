"""
Authentication Models
---------------------
Defines the core users and tenants of the system.
These tables always reside in the 'public' schema so they can be accessed globally
before a specific tenant context is established.
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.auth.roles import UserRole

class Tenant(Base):
    """
    Tenant Entity 
    -------------
    Represents a client organization (e.g. "Real Estate Agency X").
    Each tenant has a corresponding PostgreSQL Schema defined by `schema_name`.
    """
    __tablename__ = "tenants"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    developer_id = Column(String, unique=True, index=True, nullable=True) # permanent client ID
    schema_name = Column(String, unique=True, nullable=False)
    domain = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Suspension tracking
    is_suspended = Column(Boolean, default=False)
    suspension_reason = Column(String, nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_by = Column(String, nullable=True) # Email of the admin who suspended

    users = relationship("User", back_populates="tenant")


class User(Base):
    """
    User Entity
    -----------
    A system user (Agent, Admin, etc.).
    Users belong to a specific Tenant but are stored globally to allow login 
    before the schema is switched.
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # Storing as string to avoid Enum migration issues for now, but validating in logic
    is_active = Column(Boolean, default=True)
     
    tenant_id = Column(Integer, ForeignKey("public.tenants.id"))
    tenant = relationship("Tenant", back_populates="users")

import uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class UserActivityLog(Base):
    """
    User Activity Log
    -----------------
    Tracks user actions across the system for audit purposes.
    Stored in 'public' schema for global visibility.
    """
    __tablename__ = "user_activity_logs"
    __table_args__ = {"schema": "public"}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, index=True, nullable=True) # Can be null for login attempts
    tenant_id = Column(Integer, index=True, nullable=True)
    project_id = Column(Integer, index=True, nullable=True) # Scoping for project-bound events
    role = Column(String, nullable=True)
    action_type = Column(String, index=True, nullable=False) # LOGIN, CLICK, SAVE, DELETE, etc.
    entity_type = Column(String, index=True, nullable=True) # user, project, lead, etc.
    entity_id = Column(String, index=True, nullable=True)
    description = Column(String, nullable=True)
    
    # Enterprise Tracking Fields
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    page_url = Column(String, nullable=True)
    http_method = Column(String, nullable=True)
    request_payload = Column(JSONB, nullable=True) # Using JSONB for performance/search
    response_status = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    meta_data = Column(JSONB, nullable=True)
    is_archived = Column(Boolean, default=False)
