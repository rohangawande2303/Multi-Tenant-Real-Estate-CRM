from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class TenantBase(BaseModel):
    name: str
    schema_name: str
    domain: Optional[str] = None
    developer_id: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class Tenant(TenantBase):
    id: int
    is_active: bool
    is_suspended: bool
    suspension_reason: Optional[str] = None
    suspended_at: Optional[datetime] = None
    suspended_by: Optional[str] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    role: str
    tenant_id: int
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

from uuid import UUID

class UserActivityLogBase(BaseModel):
    user_id: Optional[int] = None
    tenant_id: Optional[int] = None
    project_id: Optional[int] = None
    role: Optional[str] = None
    action_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    page_url: Optional[str] = None
    http_method: Optional[str] = None
    request_payload: Optional[dict] = None
    response_status: Optional[int] = None
    meta_data: Optional[dict] = None

class UserActivityLog(UserActivityLogBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class FrontendActivityLog(BaseModel):
    action_type: str
    project_id: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: Optional[str] = None
    page_url: Optional[str] = None
    meta_data: Optional[dict] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    tenant_id: int
    email: EmailStr

class AgencyRegistration(BaseModel):
    agency_name: str
    email: EmailStr
    password: str

class ClientOnboard(BaseModel):
    name: str
    schema_name: str
    domain: Optional[str] = None
    admin_email: EmailStr
    admin_password: str

class AgencyUser(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool

class AgencyTeam(BaseModel):
    tenant_id: int
    tenant_name: str
    users: List[AgencyUser]

class NotificationBase(BaseModel):
    title: str
    message: str
    type: Optional[str] = None
    link: Optional[str] = None

class Notification(NotificationBase):
    id: int
    user_id: Optional[int]
    tenant_id: Optional[int]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
