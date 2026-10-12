import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Multi-Tenant Real Estate CRM"
    PROJECT_VERSION: str = "1.0.0"
    
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "sp_crm")
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Environment & Demo Mode
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "DemoPass2026!")

    # Frontend URL & CORS Allowed Origins
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: list = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()
    ]

    # Authorized Agency Emails (Super-admin whitelist)
    AGENCY_EMAILS: list = [
        e.strip().lower() for e in os.getenv("AGENCY_EMAILS", "").split(",") if e.strip()
    ]

    # Brute-force Login Rate Limiting / Lockout
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOGIN_LOCKOUT_MINUTES: int = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))

    # Webhook Shared Secret (optional fallback)
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "")

    # Google Sheets Integration
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    SHEETS_ENCRYPTION_KEY: str = os.getenv("SHEETS_ENCRYPTION_KEY", "")

    def validate_startup_security(self):
        """
        Validate security settings on server start.
        In production, fail fast if insecure secrets, pooled db, or wildcards are configured.
        """
        # Neon connection string requirement: Must be DIRECT (non-pooled)
        # Because schema-per-tenant isolation relies on session-level `SET search_path`
        if self.DATABASE_URL and "-pooler" in self.DATABASE_URL:
            raise RuntimeError(
                "FATAL DATABASE CONFIGURATION ERROR: DATABASE_URL must be a direct (non-pooled) connection string, "
                "not a pooled endpoint containing '-pooler'. Neon PgBouncer transaction pooling resets/breaks "
                "PostgreSQL session-level schema switching ('SET search_path') required for multi-tenant schema isolation."
            )

        insecure_keys = {"supersecretkey", "default_secret", "secret", "changethis", ""}
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY in insecure_keys or len(self.SECRET_KEY) < 32:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION ERROR: SECRET_KEY must be at least 32 characters "
                    "and cannot use default values in production mode!"
                )
            if "*" in self.ALLOWED_ORIGINS:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION ERROR: CORS wildcard '*' is strictly forbidden in production mode with credentials!"
                )
            if not self.AGENCY_EMAILS:
                raise RuntimeError(
                    "FATAL SECURITY CONFIGURATION ERROR: AGENCY_EMAILS must be configured in production mode to prevent unauthorized agency access!"
                )

settings = Settings()
