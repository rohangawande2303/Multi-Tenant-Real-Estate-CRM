"""
Tenant Service
--------------
Handles the "heavy lifting" of Multi-Tenancy.

Key Responsibilities:
1. Create Tenant record in PUBLIC schema
2. Create a dedicated PostgreSQL schema per tenant
3. Create ALL tenant-scoped tables inside that schema
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import engine, Base
from app.auth.models import Tenant

# Import ALL tenant models so Base.metadata is complete
# (DO NOT remove even if unused directly)
from app.projects.models import Project
from app.models.lead import Lead
from app.models.lead_activity import LeadActivity
from app.models.lead_call_log import LeadCallLog


import random
import string

def generate_unique_developer_id(db: Session):
    """
    Generates a unique Developer ID (DEV-XXXXX) with collision check.
    """
    while True:
        # Generate 5 random uppercase digits/letters
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
        dev_id = f"DEV-{suffix}"
        
        # Check uniqueness
        exists = db.query(Tenant).filter(Tenant.developer_id == dev_id).first()
        if not exists:
            return dev_id

def create_tenant_schema(
    db: Session,
    tenant_name: str,
    schema_name: str,
    domain: str = None
):
    """
    Creates a new Tenant and provisions their database schema.

    IMPORTANT MULTI-TENANT GUARANTEE:
    - public schema -> Users, Tenants
    - tenant schema -> Projects, Leads, Assignments, etc.
    """

    # ======================================================
    # 1️⃣ Create Tenant record (PUBLIC schema)
    # ======================================================
    db_tenant = Tenant(
        name=tenant_name,
        schema_name=schema_name,
        domain=domain,
        developer_id=generate_unique_developer_id(db)
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)

    # ======================================================
    # 2️⃣ Create PostgreSQL schema for tenant
    # ======================================================
    with engine.begin() as conn:
        conn.execute(
            text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        )

    # ======================================================
    # 3️⃣ Create ALL tenant tables (CORRECT WAY)
    # ------------------------------------------------------
    # ❌ DO NOT create tables one-by-one
    # ❌ DO NOT manually loop metadata tables
    #
    # ✅ Always use:
    #    - SET search_path
    #    - schema_translate_map
    #    - Base.metadata.create_all()
    #
    # This guarantees:
    # - projects exists
    # - project_user exists
    # - future tenant tables auto-create correctly
    #
    # CRITICAL FIX: Use engine.begin() instead of engine.connect()
    # to ensure the CREATE TABLE statements are committed to the database
    # ======================================================
    with engine.begin() as conn:
        # Ensure tenant schema is first in search path
        conn.execute(
            text(f'SET search_path TO "{schema_name}", public')
        )

        # Dynamically bind "default schema" to tenant schema
        conn = conn.execution_options(
            schema_translate_map={None: schema_name}
        )

        print(f"DEBUG: Creating tables for schema {schema_name}...")
        try:
            # Create ALL tenant-scoped tables in one atomic call
            Base.metadata.create_all(bind=conn)
            print("DEBUG: Tables created successfully.")
        except Exception as e:
            print(f"DEBUG: create_all FAILED: {e}")
            raise e

    return db_tenant
