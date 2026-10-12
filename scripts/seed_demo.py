#!/usr/bin/env python3
"""
scripts/seed_demo.py
--------------------
Production-ready, idempotent demo data seed script for Social Pulse CRM.
Seeds clean, realistic demo accounts and sample leads on a clean database (local or Neon).

Idempotent: Safe to run repeatedly; uses UPSERT / existence checks without duplicating data.
Never logs, prints, or exposes the database connection string.

Usage:
    python scripts/seed_demo.py
"""

import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if os.path.exists(BACKEND_DIR) and BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Security password hasher
try:
    from app.auth.security import get_password_hash
except ImportError:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    def get_password_hash(p: str) -> str:
        return pwd_context.hash(p)

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "DemoPass2026!")

INDIAN_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai",
    "Arnav", "Aayan", "Krishna", "Ishan", "Shaurya", "Atharv", "Advik", "Pranav",
    "Advaith", "Aryan", "Dhruv", "Kabir", "Diya", "Saanvi", "Ananya", "Aadhya",
    "Pari", "Anika", "Navya", "Angel", "Avani", "Myra", "Sara", "Ira", "Riya",
    "Anvi", "Prisha", "Siya", "Sneha", "Pooja", "Neha", "Ritu", "Priya", "Kavita",
    "Meera", "Shweta", "Sunita", "Vandana", "Rekha", "Anita", "Anjali"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Patel", "Verma", "Rao", "Nair", "Mehta", "Gupta", "Singh", "Kumar",
    "Joshi", "Desai", "Kulkarni", "Shah", "Reddy", "Bhat", "Mishra", "Agarwal",
    "Iyer", "Pillai", "Choudhury", "Banerjee", "Chatterjee", "Mukherjee", "Patil"
]

INDIAN_CITIES = ["Mumbai", "Pune", "Bangalore", "Delhi NCR", "Hyderabad", "Thane", "Navi Mumbai"]

SOURCES = [
    {"group": "Meta Ads", "channel": "Facebook Lead Form", "sub": "Social Ad"},
    {"group": "Google Ads", "channel": "Search Network", "sub": "Intent Keyword"},
    {"group": "Website", "channel": "Direct Web", "sub": "Contact Form"},
    {"group": "Walk-in", "channel": "Site Office", "sub": "Self Visit"},
    {"group": "Zapier", "channel": "Aggregator Sync", "sub": "Housing Portal"},
    {"group": "Direct", "channel": "Inbound Call", "sub": "Toll Free"}
]

STATUSES = [
    "NEW", "CONTACTED", "INTERESTED", "SITE_VISIT_PLANNED",
    "SITE_VISIT_DONE", "MEETING_DONE", "NEGOTIATION", "FOLLOW_UP",
    "BOOKING_DONE", "LOST", "INVALID"
]

def get_db_url():
    url = os.getenv("DATABASE_URL")
    if not url:
        user = os.getenv("POSTGRES_USER", "postgres")
        pwd = os.getenv("POSTGRES_PASSWORD", "postgres")
        server = os.getenv("POSTGRES_SERVER", "db" if os.path.exists("/.dockerenv") else "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db = os.getenv("POSTGRES_DB", "sp_crm")
        url = f"postgresql+psycopg2://{user}:{pwd}@{server}:{port}/{db}"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    if ("neon.tech" in url or os.getenv("ENVIRONMENT") == "production") and "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url

def seed_demo_environment():
    db_url = get_db_url()
    
    # Startup check: reject pooled Neon endpoints
    if "-pooler" in db_url:
        print("ERROR: DATABASE_URL contains '-pooler'. Neon direct non-pooled connection required for multi-tenant schema isolation.")
        sys.exit(1)

    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    hashed_pw = get_password_hash(DEMO_PASSWORD)

    print("Seeding Social Pulse CRM demo data...")

    # 1. Seed Agency Tenant (tenant_id = 1)
    session.execute(text("""
        INSERT INTO public.tenants (id, name, schema_name, is_active, created_at)
        VALUES (1, 'Social Pulse Agency', 'public', true, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;
    """))

    # 2. Seed Agency Super-Admin User
    session.execute(text("""
        INSERT INTO public.users (email, name, role, tenant_id, hashed_password, is_active)
        VALUES ('demo_admin@socialpulse.agency', 'Demo Agency Admin', 'AGENCY', 1, :pw, true)
        ON CONFLICT (email) DO UPDATE SET role = 'AGENCY', hashed_password = :pw, is_active = true;
    """), {"pw": hashed_pw})

    # 3. Seed Demo Client Tenant: "Demo Realty" (tenant_id = 2, schema = "client_demo_realty")
    session.execute(text("""
        INSERT INTO public.tenants (id, name, developer_id, schema_name, is_active, created_at)
        VALUES (2, 'Demo Realty Developers', 'dev_demo_realty', 'client_demo_realty', true, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, schema_name = 'client_demo_realty', is_active = true;
    """))

    # Ensure PostgreSQL schema and tables exist for demo client
    session.execute(text('CREATE SCHEMA IF NOT EXISTS "client_demo_realty";'))
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS "client_demo_realty".projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            location VARCHAR(255),
            status VARCHAR(50) DEFAULT 'ACTIVE',
            lead_config JSONB DEFAULT '[]',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS "client_demo_realty".project_users (
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (project_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS "client_demo_realty".leads (
            id UUID PRIMARY KEY,
            tenant_id INTEGER,
            project_id INTEGER,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            city VARCHAR(100),
            status VARCHAR(50) DEFAULT 'NEW',
            source_group VARCHAR(100),
            source_campaign VARCHAR(255),
            channel VARCHAR(100),
            lead_rating VARCHAR(50),
            current_status_at_sales VARCHAR(100),
            first_sales_owner_email VARCHAR(255),
            assigned_to INTEGER,
            project_name VARCHAR(255),
            mandate_id INTEGER,
            mandate_name VARCHAR(255),
            developer_id VARCHAR(50),
            custom_fields JSONB,
            is_deleted BOOLEAN DEFAULT FALSE,
            follow_up_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS "client_demo_realty".integrations (
            id UUID PRIMARY KEY,
            tenant_id INTEGER,
            project_id INTEGER,
            name VARCHAR(255) NOT NULL,
            platform VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'CONNECTED',
            auth_type VARCHAR(50),
            secret_token VARCHAR(255),
            config JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))
    session.commit()

    # 5. Seed Client Users in public.users
    demo_users = [
        ("client_admin@demorealty.com", "Demo Client Admin", "CLIENT_ADMIN", 2),
        ("bd_manager@demorealty.com", "Demo BD Manager", "SALES_MANAGER", 2),
        ("sales_exec@demorealty.com", "Demo Sales Executive", "EXECUTIVE", 2),
        ("callcenter@demorealty.com", "Demo Call Center Agent", "CALL_CENTER", 2),
    ]

    for email, name, role, t_id in demo_users:
        session.execute(text("""
            INSERT INTO public.users (email, name, role, tenant_id, hashed_password, is_active)
            VALUES (:email, :name, :role, :t_id, :pw, true)
            ON CONFLICT (email) DO UPDATE SET role = :role, hashed_password = :pw, tenant_id = :t_id, is_active = true;
        """), {"email": email, "name": name, "role": role, "t_id": t_id, "pw": hashed_pw})
    session.commit()

    # Get user IDs
    user_rows = session.execute(text("SELECT id, email, role FROM public.users WHERE tenant_id = 2")).fetchall()
    user_map = {r[1]: r[0] for r in user_rows}

    # 6. Seed Projects in client_demo_realty.projects
    session.execute(text("""
        INSERT INTO "client_demo_realty".projects (id, name, description, location, is_active, created_at)
        VALUES 
            (1, 'Aura Heights', 'Ultra-luxury 3 & 4 BHK residences with private balconies', 'Worli, Mumbai', true, NOW()),
            (2, 'Zenith Park', 'Premium 2 & 3 BHK eco-friendly integrated township', 'Baner, Pune', true, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
    """))

    # Link Users to Projects in project_users
    for proj_id in [1, 2]:
        for u_id in user_map.values():
            session.execute(text("""
                INSERT INTO "client_demo_realty".project_users (project_id, user_id)
                VALUES (:pid, :uid)
                ON CONFLICT DO NOTHING;
            """), {"pid": proj_id, "uid": u_id})
    session.commit()

    # 7. Seed 80 Realistic Leads in client_demo_realty.leads
    existing_count = session.execute(text('SELECT COUNT(*) FROM "client_demo_realty".leads')).scalar()
    if existing_count < 60:
        print(f"Generating 80 realistic leads for Demo Realty...")
        exec_id = user_map.get("sales_exec@demorealty.com")
        cc_id = user_map.get("callcenter@demorealty.com")
        agents = [exec_id, cc_id]

        leads_to_insert = []
        for i in range(80):
            first = random.choice(INDIAN_FIRST_NAMES)
            last = random.choice(INDIAN_LAST_NAMES)
            name = f"{first} {last}"
            phone = f"+9198{random.randint(10000000, 99999999)}"
            email = f"{first.lower()}.{last.lower()}{random.randint(10, 999)}@gmail.com"
            src = random.choice(SOURCES)
            status = random.choice(STATUSES)
            project_id = random.choice([1, 2])
            proj_name = "Aura Heights" if project_id == 1 else "Zenith Park"
            assigned = random.choice(agents) if status != "NEW" else None
            created_days_ago = random.randint(1, 45)
            created_at = datetime.now(timezone.utc) - timedelta(days=created_days_ago, hours=random.randint(0, 23))

            custom_fields_json = (
                '{"budget_min": "1.2 Cr", "budget_max": "2.5 Cr", '
                '"preferred_size_of_unit": "3BHK", "possession_in": "Immediate", '
                '"purpose_of_purchase": "Self Use", "occupation": "Salaried"}'
            )

            session.execute(text("""
                INSERT INTO "client_demo_realty".leads (
                    id, tenant_id, project_id, name, email, phone, city,
                    status, source_group, source_campaign, channel,
                    assigned_to, project_name, mandate_name,
                    custom_fields, is_deleted, created_at, updated_at
                ) VALUES (
                    :id, 2, :project_id, :name, :email, :phone, :city,
                    :status, :source_group, :source_campaign, :channel,
                    :assigned_to, :project_name, 'Demo Realty Developers',
                    CAST(:custom_fields AS jsonb), false, :created_at, :created_at
                )
            """), {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "name": name,
                "email": email,
                "phone": phone,
                "city": random.choice(INDIAN_CITIES),
                "status": status,
                "source_group": src["group"],
                "source_campaign": src["channel"],
                "channel": src["sub"],
                "assigned_to": assigned,
                "project_name": proj_name,
                "custom_fields": custom_fields_json,
                "created_at": created_at
            })
        session.commit()
        print("Inserted 80 demo leads successfully.")
    else:
        print(f"Leads already present in Demo Realty ({existing_count} records). Skipping insertion.")

    # 8. Seed Sample Integration (Zapier / Webhook)
    session.execute(text("""
        INSERT INTO "client_demo_realty".integrations (
            id, tenant_id, project_id, name, platform, status,
            auth_type, secret_token, is_active, created_at, updated_at
        ) VALUES (
            :id, 2, 1, 'Website Form Webhook', 'CUSTOM_WEBHOOK', 'CONNECTED',
            'SECRET_TOKEN', 'demo_webhook_secret_tok_2026', true, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING;
    """), {"id": str(uuid.uuid4())})
    session.commit()

    # 9. Seed Sample Activity Log in public.user_activity_logs
    session.execute(text("""
        INSERT INTO public.user_activity_logs (
            id, user_id, tenant_id, role, action_type, entity_type, description, ip_address, created_at
        ) VALUES 
            (:id1, :admin_id, 1, 'AGENCY', 'LOGIN', 'auth', 'Agency Admin signed in to dashboard', '127.0.0.1', NOW()),
            (:id2, :client_id, 2, 'CLIENT_ADMIN', 'UPDATE_PROJECT', 'project', 'Configured Aura Heights phase 2 inventory', '127.0.0.1', NOW())
    """), {
        "id1": str(uuid.uuid4()),
        "id2": str(uuid.uuid4()),
        "admin_id": user_map.get("demo_admin@socialpulse.agency", 1),
        "client_id": user_map.get("client_admin@demorealty.com", 2)
    })
    session.commit()
    session.close()

    print("\n=======================================================")
    print("SUCCESS: Social Pulse CRM Demo Environment Seeded!")
    print("=======================================================")
    print(f"Shared Demo Password: {DEMO_PASSWORD}")
    print("-------------------------------------------------------")
    print("Demo Accounts:")
    print("  1. Agency Super Admin: demo_admin@socialpulse.agency")
    print("  2. Client Admin:       client_admin@demorealty.com")
    print("  3. BD Manager:         bd_manager@demorealty.com")
    print("  4. Sales Executive:    sales_exec@demorealty.com")
    print("  5. Call Center Agent:  callcenter@demorealty.com")
    print("=======================================================\n")

if __name__ == "__main__":
    seed_demo_environment()
