from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.auth import models, security
from app.auth.models import Tenant, User

def init_db(db: Session):
    # Create Agency Tenant if not exists
    agency_tenant = db.query(Tenant).filter(Tenant.name == "Agency Global").first()
    if not agency_tenant:
        agency_tenant = Tenant(
            name="Agency Global",
            schema_name="agency_central",
            domain="agency.com"
        )
        db.add(agency_tenant)
        db.commit()
        db.refresh(agency_tenant)
        print("Created Agency Tenant")

    # Create Super Admin if not exists
    admin_email = "admin@agency.com"
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            hashed_password=security.get_password_hash("admin123"),
            role="AGENCY", 
            tenant_id=agency_tenant.id,
            is_active=True 
        )
        db.add(admin)
        db.commit()
        print("Created Super Admin User")
    else:
        print("Super Admin already exists")

if __name__ == "__main__":
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_db(db)
    db.close()
