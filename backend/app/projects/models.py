from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
from app.auth.roles import UserRole
import app.auth.models

# ============================================================
# Association Table for Project <-> User (Many-to-Many)
# ------------------------------------------------------------
# IMPORTANT MULTI-TENANT NOTE:
# - This table MUST live inside each tenant schema
# - It references:
#     • projects.id  -> tenant schema
#     • public.users.id -> shared public schema
#
# schema=None is CRITICAL:
# It allows SQLAlchemy's schema_translate_map to dynamically
# place this table inside the active tenant schema.
# ============================================================
project_user_association = Table(
    "project_user",
    Base.metadata,
    Column(
        "project_id",
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "user_id",
        Integer,
        ForeignKey("public.users.id", ondelete="CASCADE"),
        primary_key=True
    ),
    schema=None  # ⬅️ REQUIRED for schema-based multi-tenancy
)


class Project(Base):
    __tablename__ = "projects"
    # --------------------------------------------------------
    # NOTE:
    # - This model is SHARED across tenants
    # - Actual table location depends on active schema
    # - Schema is resolved via:
    #     SET search_path + schema_translate_map
    # --------------------------------------------------------

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")

    # Dynamic lead configuration per project
    # Example:
    # [{"key": "lead_id", "label": "Lead ID", "type": "text", "required": true}]
    lead_config = Column(JSONB, default=list)

    # Relationship to users via tenant-scoped association table
    users = relationship(
        lambda: app.auth.models.User,
        secondary=project_user_association
    )
