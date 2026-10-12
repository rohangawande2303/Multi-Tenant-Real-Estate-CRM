from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from app.auth.roles import UserRole

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    lead_config: List[Dict[str, Any]] = [] # Flexible list of field defs

class ProjectCreate(ProjectBase):
    tenant_id: Optional[int] = None

class Project(ProjectBase):
    id: int
    
    class Config:
        from_attributes = True

class ProjectAssign(BaseModel):
    user_ids: List[int]

class ProjectWithTenant(Project):
    tenant_id: int
    tenant_name: str
