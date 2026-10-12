#!/usr/bin/env python3
"""
scripts/seed_sample_leads.py
----------------------------
Reusable sample leads generator and cleanup tool for Social Pulse CRM.

Works for ANY client tenant, including newly created clients from the Agency dashboard.
Reads database connection strictly from DATABASE_URL environment variable.
Supports local PostgreSQL and remote Neon (direct, non-pooled connection).
Never logs, prints, or exposes the database connection string.

Usage:
    python scripts/seed_sample_leads.py --all
    python scripts/seed_sample_leads.py --tenant client_apex --count 25
    python scripts/seed_sample_leads.py --tenant "Hubtown developer" --project "Skyline" --count 25
    python scripts/seed_sample_leads.py --tenant client_apex --remove-samples
"""

import os
import sys
import argparse
import random
import uuid
from datetime import datetime, timedelta, timezone

# Ensure backend modules can be imported if available
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if os.path.exists(BACKEND_DIR) and BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Dropdown options matching dropdown_options.py strictly
DROPDOWN_OPTIONS = {
    "current_residence_type": ["Owned", "Rented", "Family Owned", "PG", "Other"],
    "occupation": ["Salaried", "Business", "Professional", "Self Employed", "Retired", "Student", "Homemaker", "Other"],
    "industry": ["IT/Software", "Finance/Banking", "Healthcare", "Manufacturing", "Real Estate", "Education", "Retail", "Government", "Other"],
    "gender": ["Male", "Female", "Other", "Prefer not to say"],
    "nri": ["Yes", "No"],
    "possession_in": ["Immediate", "3 months", "6 months", "1 year", "2 years", "3+ years"],
    "mode_of_payment": ["Home Loan", "Cash", "Both", "Other"],
    "purpose_of_purchase": ["Self Use", "Investment", "Rental Income", "Resale", "Future Planning", "Other"],
    "preferred_size_of_unit": ["Studio", "1BHK", "1.5BHK", "2BHK", "2.5BHK", "3BHK", "3.5BHK", "4BHK", "5BHK+", "Villa", "Penthouse", "Duplex"],
    "preferred_floor": ["Ground", "Low (1-5)", "Mid (6-15)", "High (16+)", "Penthouse", "Top Floor", "Any"],
    "lead_rating": ["Hot", "Warm", "Cold"],
    "current_status_at_sales": ["Fresh", "Contacted", "Interested", "Site Visit Planned", "Site Visit Done", "Meeting Done", "Negotiation", "Follow-up", "Booking Done", "Failed", "Junk"],
    "call_status": ["Connected", "Not Connected", "Busy", "Switched Off", "Invalid Number", "DND", "Call Back"],
}

INDIAN_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai",
    "Arnav", "Aayan", "Krishna", "Ishan", "Shaurya", "Atharv", "Advik", "Pranav",
    "Advaith", "Aryan", "Dhruv", "Kabir", "Diya", "Saanvi", "Ananya", "Aadhya",
    "Pari", "Anika", "Navya", "Angel", "Avani", "Myra", "Sara", "Ira", "Riya",
    "Anvi", "Prisha", "Siya", "Sneha", "Pooja", "Neha", "Ritu", "Priya", "Kavita",
    "Meera", "Shweta", "Sunita", "Vandana", "Rekha", "Anita", "Anjali", "Rohan"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Patel", "Verma", "Rao", "Nair", "Mehta", "Gupta", "Singh", "Kumar",
    "Joshi", "Desai", "Kulkarni", "Shah", "Reddy", "Bhat", "Mishra", "Agarwal",
    "Iyer", "Pillai", "Choudhury", "Banerjee", "Chatterjee", "Mukherjee", "Patil",
    "Shinde", "Deshmukh", "Kadam", "Bhosale", "Jadhav"
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

BUDGET_PAIRS = [
    ("45 Lakhs", "65 Lakhs"),
    ("65 Lakhs", "90 Lakhs"),
    ("90 Lakhs", "1.25 Crore"),
    ("1.25 Crore", "1.80 Crore"),
    ("1.80 Crore", "2.50 Crore"),
    ("2.50 Crore", "4.00 Crore")
]

STATUS_MAPPING = {
    "Fresh": "NEW",
    "Contacted": "CONTACTED",
    "Interested": "INTERESTED",
    "Site Visit Planned": "QUALIFIED",
    "Site Visit Done": "QUALIFIED",
    "Meeting Done": "QUALIFIED",
    "Negotiation": "QUALIFIED",
    "Follow-up": "CONTACTED",
    "Booking Done": "WON",
    "Failed": "LOST",
    "Junk": "LOST"
}


def get_db_engine():
    """Retrieve database engine securely using only DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Check local .env as fallback if running outside docker
        env_path = os.path.join(BACKEND_DIR, ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL="):
                        db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break

    if not db_url:
        print("ERROR: DATABASE_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Do NOT print db_url for security
    return create_engine(db_url, pool_pre_ping=True)


def resolve_tenants(session, tenant_arg):
    """Resolve which tenants to process."""
    if tenant_arg and tenant_arg.lower() != "all":
        query = text(
            "SELECT id, name, schema_name, developer_id FROM public.tenants "
            "WHERE schema_name = :t OR name ILIKE :t_like OR developer_id = :t"
        )
        rows = session.execute(query, {"t": tenant_arg, "t_like": f"%{tenant_arg}%"}).fetchall()
        if not rows:
            print(f"ERROR: No tenant found matching '{tenant_arg}'.", file=sys.stderr)
            sys.exit(1)
        return rows
    else:
        # If --all or unspecified, fetch all tenants
        query = text("SELECT id, name, schema_name, developer_id FROM public.tenants ORDER BY id")
        rows = session.execute(query).fetchall()
        return rows


def remove_sample_leads(session, tenant):
    """Remove only sample leads for a tenant."""
    schema = tenant.schema_name
    print(f"Removing sample leads for tenant '{tenant.name}' (schema: {schema})...")

    # Verify table exists in schema
    check_table = text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = :s AND table_name = 'leads')"
    )
    if not session.execute(check_table, {"s": schema}).scalar():
        print(f"  Schema '{schema}' has no leads table. Skipping.")
        return 0

    # Delete lead activity logs for sample leads
    del_logs_query = text(f"""
        DELETE FROM "{schema}".lead_activity_logs
        WHERE lead_id IN (
            SELECT id FROM "{schema}".leads
            WHERE custom_fields->>'sample' = 'true'
        )
    """)
    session.execute(del_logs_query)

    # Delete sample leads
    del_leads_query = text(f"""
        DELETE FROM "{schema}".leads
        WHERE custom_fields->>'sample' = 'true'
    """)
    result = session.execute(del_leads_query)
    session.commit()
    deleted_count = result.rowcount
    print(f"  Deleted {deleted_count} sample leads from '{tenant.name}'.")
    return deleted_count


def seed_tenant_leads(session, tenant, project_arg=None, count=25):
    """Seed sample leads into a tenant schema."""
    schema = tenant.schema_name
    tenant_id = tenant.id
    tenant_name = tenant.name
    developer_id = tenant.developer_id or f"DEV-{tenant_id}"

    # Verify schema and tables exist
    check_table = text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = :s AND table_name = 'leads')"
    )
    if not session.execute(check_table, {"s": schema}).scalar():
        print(f"  Schema '{schema}' has no leads table. Skipping.")
        return 0

    # Get or create projects for this tenant
    projects_query = text(f'SELECT id, name FROM "{schema}".projects ORDER BY id')
    existing_projects = session.execute(projects_query).fetchall()

    target_projects = []
    if project_arg:
        # Match by ID or name
        for p in existing_projects:
            if str(p.id) == str(project_arg) or p.name.lower() == str(project_arg).lower():
                target_projects.append(p)
                break
        if not target_projects:
            # If specified project doesn't exist, create it
            proj_name = str(project_arg)
            insert_proj = text(
                f'INSERT INTO "{schema}".projects (name, description, status) '
                f"VALUES (:name, :desc, 'ACTIVE') RETURNING id, name"
            )
            created_p = session.execute(
                insert_proj,
                {"name": proj_name, "desc": f"Project {proj_name} for {tenant_name}"}
            ).fetchone()
            session.commit()
            target_projects.append(created_p)
            print(f"  Created requested project '{proj_name}' (ID: {created_p.id})")
    else:
        if existing_projects:
            target_projects = existing_projects
        else:
            # Create a default project for tenants with no projects
            default_name = f"{tenant_name} Towers"
            insert_proj = text(
                f'INSERT INTO "{schema}".projects (name, description, status) '
                f"VALUES (:name, :desc, 'ACTIVE') RETURNING id, name"
            )
            created_p = session.execute(
                insert_proj,
                {"name": default_name, "desc": f"Flagship development by {tenant_name}"}
            ).fetchone()
            session.commit()
            target_projects.append(created_p)
            print(f"  Created default project '{default_name}' (ID: {created_p.id})")

    # Fetch users belonging to this tenant for assignment
    users_query = text("SELECT id, email, role FROM public.users WHERE tenant_id = :tid")
    tenant_users = session.execute(users_query, {"tid": tenant_id}).fetchall()

    total_added = 0
    now = datetime.now(timezone.utc)

    for proj in target_projects:
        project_id = proj.id
        project_name = proj.name

        # Query existing phones in this project to avoid duplicates
        existing_phones_query = text(f'SELECT phone FROM "{schema}".leads WHERE project_id = :pid')
        existing_phones = {row[0] for row in session.execute(existing_phones_query, {"pid": project_id}).fetchall()}

        leads_to_insert = []
        activities_to_insert = []

        attempts = 0
        while len(leads_to_insert) < count and attempts < (count * 4):
            attempts += 1
            phone_suffix = random.randint(10000, 99999)
            phone = f"90000{phone_suffix}"

            if phone in existing_phones:
                continue
            existing_phones.add(phone)

            first_name = random.choice(INDIAN_FIRST_NAMES)
            last_name = random.choice(INDIAN_LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@example.com"

            # Assign user if available
            assigned_user = random.choice(tenant_users) if tenant_users else None
            assigned_id = assigned_user.id if assigned_user else None
            assigned_email = assigned_user.email if assigned_user else None

            # Dates over the last 60 days
            days_ago = random.randint(0, 60)
            created_at = now - timedelta(
                days=days_ago,
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )

            # Dropdown selections
            sales_status = random.choice(DROPDOWN_OPTIONS["current_status_at_sales"])
            canonical_status = STATUS_MAPPING.get(sales_status, "NEW")
            lead_rating = random.choice(DROPDOWN_OPTIONS["lead_rating"])
            call_status = random.choice(DROPDOWN_OPTIONS["call_status"])
            residence_type = random.choice(DROPDOWN_OPTIONS["current_residence_type"])
            occupation = random.choice(DROPDOWN_OPTIONS["occupation"])
            purpose = random.choice(DROPDOWN_OPTIONS["purpose_of_purchase"])
            unit_size = random.choice(DROPDOWN_OPTIONS["preferred_size_of_unit"])
            floor = random.choice(DROPDOWN_OPTIONS["preferred_floor"])
            payment_mode = random.choice(DROPDOWN_OPTIONS["mode_of_payment"])
            possession = random.choice(DROPDOWN_OPTIONS["possession_in"])

            source_info = random.choice(SOURCES)
            budget_pair = random.choice(BUDGET_PAIRS)
            city = random.choice(INDIAN_CITIES)
            score = random.randint(25, 95)

            # Optional follow up date
            follow_up = None
            if sales_status in ["Contacted", "Interested", "Site Visit Planned", "Follow-up", "Negotiation"]:
                follow_up = created_at + timedelta(days=random.randint(1, 14))

            lead_id = uuid.uuid4()
            import json
            custom_fields = {
                "sample": True,
                "current_residence_type": residence_type,
                "occupation": occupation,
                "purpose_of_purchase": purpose,
                "preferred_size_of_unit": unit_size,
                "preferred_floor": floor,
                "mode_of_payment": payment_mode,
                "possession_in": possession,
                "call_status": call_status,
            }

            lead_row = {
                "id": str(lead_id),
                "tenant_id": tenant_id,
                "project_id": project_id,
                "mandate_id": tenant_id,
                "mandate_name": tenant_name,
                "developer_id": developer_id,
                "project_name": project_name,
                "name": full_name,
                "phone": phone,
                "email": email,
                "status": canonical_status,
                "current_status_at_sales": sales_status,
                "assigned_to": assigned_id,
                "first_sales_owner_email": assigned_email,
                "lead_score": score,
                "lead_rating": lead_rating,
                "source_group": source_info["group"],
                "source_channel": source_info["channel"],
                "source_sub_channel": source_info["sub"],
                "city": city,
                "budget_min": budget_pair[0],
                "budget_max": budget_pair[1],
                "utm_source": source_info["group"].lower().replace(" ", "_"),
                "utm_medium": "cpc" if "Ads" in source_info["group"] else "organic",
                "utm_campaign": f"festive_{project_name.lower().replace(' ', '_')}",
                "custom_fields": json.dumps(custom_fields),
                "is_deleted": False,
                "follow_up_date": follow_up,
                "created_at": created_at,
                "updated_at": created_at,
                "created_by": assigned_id
            }
            leads_to_insert.append(lead_row)

            # Timeline activity log
            activity_row = {
                "lead_id": str(lead_id),
                "activity_type": "CREATE",
                "field_name": "status",
                "old_value": None,
                "new_value": sales_status,
                "performed_by": assigned_id,
                "timestamp": created_at,
                "meta_data": json.dumps({
                    "sample": True,
                    "action": "SEED_SAMPLE_LEAD",
                    "note": f"Sample lead created with status {sales_status}"
                })
            }
            activities_to_insert.append(activity_row)

        if leads_to_insert:
            insert_lead_sql = text(f"""
                INSERT INTO "{schema}".leads (
                    id, tenant_id, project_id, mandate_id, mandate_name, developer_id,
                    project_name, name, phone, email, status, current_status_at_sales,
                    assigned_to, first_sales_owner_email, lead_score, lead_rating,
                    source_group, source_channel, source_sub_channel, city,
                    budget_min, budget_max, utm_source, utm_medium, utm_campaign,
                    custom_fields, is_deleted, follow_up_date, created_at, updated_at, created_by
                ) VALUES (
                    :id, :tenant_id, :project_id, :mandate_id, :mandate_name, :developer_id,
                    :project_name, :name, :phone, :email, :status, :current_status_at_sales,
                    :assigned_to, :first_sales_owner_email, :lead_score, :lead_rating,
                    :source_group, :source_channel, :source_sub_channel, :city,
                    :budget_min, :budget_max, :utm_source, :utm_medium, :utm_campaign,
                    CAST(:custom_fields AS jsonb), :is_deleted, :follow_up_date, :created_at, :updated_at, :created_by
                )
            """)
            session.execute(insert_lead_sql, leads_to_insert)

            insert_act_sql = text(f"""
                INSERT INTO "{schema}".lead_activity_logs (
                    lead_id, activity_type, field_name, old_value, new_value,
                    performed_by, timestamp, meta_data
                ) VALUES (
                    :lead_id, :activity_type, :field_name, :old_value, :new_value,
                    :performed_by, :timestamp, CAST(:meta_data AS jsonb)
                )
            """)
            session.execute(insert_act_sql, activities_to_insert)
            session.commit()

            print(f"  Project '{project_name}' (ID: {project_id}): seeded {len(leads_to_insert)} sample leads.")
            total_added += len(leads_to_insert)
        else:
            print(f"  Project '{project_name}' (ID: {project_id}): no new leads needed (already present).")

    return total_added


def print_client_summary_table(session):
    """Print an aligned status table of clients, users, projects, and lead counts."""
    tenants = session.execute(text("SELECT id, name, schema_name FROM public.tenants ORDER BY id")).fetchall()
    
    print("\n" + "=" * 95)
    print(f"{'TENANT / CLIENT':<28} | {'ROLE':<14} | {'LOGIN EMAIL':<32} | {'PROJECT (LEADS)':<16}")
    print("=" * 95)

    for t in tenants:
        users = session.execute(
            text("SELECT email, role FROM public.users WHERE tenant_id = :tid ORDER BY id"),
            {"tid": t.id}
        ).fetchall()

        projects_summary = []
        try:
            projs = session.execute(text(f'SELECT id, name FROM "{t.schema_name}".projects ORDER BY id')).fetchall()
            for p in projs:
                l_count = session.execute(
                    text(f'SELECT count(*) FROM "{t.schema_name}".leads WHERE project_id = :pid'),
                    {"pid": p.id}
                ).scalar()
                projects_summary.append(f"{p.name} ({l_count})")
        except Exception:
            projects_summary = ["None"]

        proj_str = ", ".join(projects_summary) if projects_summary else "No projects"

        if not users:
            print(f"{t.name:<28} | {'(no users)':<14} | {'-':<32} | {proj_str:<16}")
        else:
            for idx, u in enumerate(users):
                tenant_label = t.name if idx == 0 else ""
                proj_label = proj_str if idx == 0 else ""
                print(f"{tenant_label:<28} | {u.role:<14} | {u.email:<32} | {proj_label}")
    print("=" * 95 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Seed sample leads into Social Pulse CRM.")
    parser.add_argument("--tenant", type=str, default="all", help="Tenant schema or name, or 'all'")
    parser.add_argument("--all", dest="all_tenants", action="store_true", help="Process all tenants")
    parser.add_argument("--project", type=str, default=None, help="Target project ID or name (optional)")
    parser.add_argument("--count", type=int, default=25, help="Number of leads per project (default 25)")
    parser.add_argument("--remove-samples", action="store_true", help="Delete existing sample leads")
    parser.add_argument("--summary", action="store_true", help="Only print the summary table")
    args = parser.parse_args()

    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        if args.summary:
            print_client_summary_table(session)
            return

        tenant_target = "all" if args.all_tenants else args.tenant
        tenants = resolve_tenants(session, tenant_target)

        for tenant in tenants:
            if args.remove_samples:
                remove_sample_leads(session, tenant)
            else:
                print(f"\nProcessing tenant: '{tenant.name}' (schema: {tenant.schema_name})...")
                seed_tenant_leads(session, tenant, project_arg=args.project, count=args.count)

        print("\n Seeding operation completed successfully.")
        print_client_summary_table(session)

    except Exception as e:
        session.rollback()
        print(f"\nERROR during lead seeding: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
