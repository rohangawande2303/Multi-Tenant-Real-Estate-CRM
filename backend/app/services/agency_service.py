from sqlalchemy.orm import Session
from sqlalchemy import text
from app.auth.models import Tenant, User
from app.projects.models import Project
from app.core.database import SessionLocal, engine
from typing import List, Dict, Any

class AgencyService:
    def get_hierarchical_team(self, db: Session) -> List[Dict[str, Any]]:
        """
        Returns a list of tenants, each with its list of users.
        Ordered by tenant ID to ensure the primary agency (ID=1) stays at the top.
        """
        tenants = db.query(Tenant).filter(Tenant.is_active == True).order_by(Tenant.id.asc()).all()
        result = []
        for tenant in tenants:
            tenant_users = [
                {
                    "id": u.id,
                    "email": u.email,
                    "role": u.role,
                    "is_active": u.is_active,
                    "name": getattr(u, 'name', None) or u.email.split('@')[0]
                }
                for u in tenant.users
            ]
            result.append({
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "users": tenant_users
            })
        return result

    def get_all_projects(self, db: Session) -> List[Dict[str, Any]]:
        """
        Aggregates projects from all tenant schemas.
        Iterates through active tenants and collects project metadata.
        """
        try:
            tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
            all_projects = []
            
            for tenant in tenants:
                # Safely switch to tenant schema context
                tenant_engine = engine.execution_options(schema_translate_map={None: tenant.schema_name})
                tenant_session = SessionLocal(bind=tenant_engine)
                try:
                    # Set search path for safety in raw queries if needed
                    tenant_session.execute(text(f'SET search_path TO "{tenant.schema_name}", public'))
                    
                    projects = tenant_session.query(Project).all()
                    for p in projects:
                        all_projects.append({
                            "id": p.id,
                            "name": p.name,
                            "description": p.description,
                            "status": p.status,
                            "tenant_id": tenant.id,
                            "tenant_name": tenant.name
                        })
                except Exception as e:
                    # Log and continue to next tenant if one fails
                    print(f"Error fetching projects for tenant {tenant.name}: {e}")
                finally:
                    tenant_session.close()
            
            return all_projects
        except Exception as e:
            print(f"Global error in project aggregation: {e}")
            return []

agency_service = AgencyService()
