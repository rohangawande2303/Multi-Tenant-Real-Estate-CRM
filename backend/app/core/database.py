"""
Database Configuration
----------------------
Handles the SQLAlchemy connection engine and session creation.
Includes the dynamic schema switching logic based on `tenant_context`.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if SQLALCHEMY_DATABASE_URL:
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Enforce sslmode=require for Neon or production environments if not explicitly specified
    if ("neon.tech" in SQLALCHEMY_DATABASE_URL or settings.ENVIRONMENT == "production") and "sslmode=" not in SQLALCHEMY_DATABASE_URL:
        separator = "&" if "?" in SQLALCHEMY_DATABASE_URL else "?"
        SQLALCHEMY_DATABASE_URL = f"{SQLALCHEMY_DATABASE_URL}{separator}sslmode=require"

    if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Create the Engine
# pool_pre_ping=True and limited pool size protect against serverless idle timeouts
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

# SessionLocal is a factory for creating new database sessions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import text
from app.core.context import tenant_context

def get_db():
    """
    Dependency generator that yields a database session.
    
    CRITICAL: This function reads the current tenant from `tenant_context`
    and modifies the PostgreSQL `search_path` and `schema_translate_map`.
    """
    tenant = tenant_context.get()
    
    if tenant != "public":
        import re
        if not re.match(r"^[a-z][a-z0-9_]{2,40}$", tenant):
            raise ValueError(f"Invalid schema name format: {tenant}")
        # Create a connection with translated schema
        # This ensures SQLAlchemy knows to use the tenant schema for tables with schema=None
        tenant_engine = engine.execution_options(schema_translate_map={None: tenant})
        db = SessionLocal(bind=tenant_engine)
        try:
            # Also set search_path for raw SQL queries with safe double quoting
            db.execute(text(f'SET search_path TO "{tenant}", public'))
            yield db
        finally:
            db.close()
    else:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
