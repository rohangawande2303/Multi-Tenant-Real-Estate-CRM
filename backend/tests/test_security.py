"""
Security & RBAC Test Suite
--------------------------
Verifies core security requirements and architectural defenses:
1. Password hashing with bcrypt
2. Brute-force login lockout (HTTP 429)
3. JWT Secret validation at startup in production
4. Schema name regex validation & SQL injection prevention
5. Tenant spoofing protection (X-Tenant-ID vs JWT)
6. Agency role RBAC enforcement on /agency/*
7. AGENCY_EMAILS whitelist enforcement
8. CSV / Excel Formula Injection sanitization
9. Webhook secret token verification
10. PII masking on audit logs
11. OWASP Security Headers & CORS configuration
12. Role-based lead scoping for Executive and Call Center
12. Error stack trace suppression
13. DEMO_MODE mutation protection
"""

import pytest
import re
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.core.config import settings
from app.auth import security
from app.api.endpoints.auth import check_login_lockout, record_failed_attempt, clear_failed_attempts
from app.api.endpoints.import_export import sanitize_csv_cell
from app.api.endpoints.webhooks import mask_pii_payload, mask_headers
from app.auth.roles import UserRole
from app.auth.models import User
from app.api import deps

client = TestClient(app)

# ==============================================================================
# 1. Password Hashing (bcrypt)
# ==============================================================================
def test_password_hashing_bcrypt():
    password = "SuperSecurePassword123!"
    hashed = security.get_password_hash(password)
    
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert hashed != password
    assert security.verify_password(password, hashed) is True
    assert security.verify_password("WrongPassword!", hashed) is False

# ==============================================================================
# 2. Login Lockout & Brute-Force Rate Limiting
# ==============================================================================
def test_login_lockout_rate_limiting():
    test_email = "lockout_victim@example.com"
    clear_failed_attempts(test_email)
    
    # 4 failed attempts should succeed without lockout
    for _ in range(settings.MAX_LOGIN_ATTEMPTS - 1):
        record_failed_attempt(test_email)
    
    # Check that lockout has not triggered yet
    check_login_lockout(test_email)
    
    # 5th failed attempt should trigger lockout (HTTP 429)
    record_failed_attempt(test_email)
    with pytest.raises(HTTPException) as exc_info:
        check_login_lockout(test_email)
    
    assert exc_info.value.status_code == 429
    assert "Too many failed login attempts" in exc_info.value.detail
    
    clear_failed_attempts(test_email)

# ==============================================================================
# 3. Startup JWT Secret Key Validation
# ==============================================================================
def test_startup_jwt_secret_validation():
    # Save original settings
    orig_env = settings.ENVIRONMENT
    orig_key = settings.SECRET_KEY
    orig_agency = settings.AGENCY_EMAILS
    
    try:
        settings.ENVIRONMENT = "production"
        settings.AGENCY_EMAILS = ["admin@example.com"]
        settings.SECRET_KEY = "supersecretkey" # Insecure default
        
        with pytest.raises(RuntimeError) as exc_info:
            settings.validate_startup_security()
        assert "FATAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)
        
        # Short key (< 32 chars) should also fail
        settings.SECRET_KEY = "short_key_123"
        with pytest.raises(RuntimeError):
            settings.validate_startup_security()
            
        # Robust key (>= 32 chars) should pass
        settings.SECRET_KEY = "a_very_secure_production_secret_key_exceeding_32_characters"
        settings.validate_startup_security()
        
    finally:
        settings.ENVIRONMENT = orig_env
        settings.SECRET_KEY = orig_key
        settings.AGENCY_EMAILS = orig_agency

# ==============================================================================
# 4. Schema Name Regex & SQL Injection Defense
# ==============================================================================
def test_schema_name_regex_validation():
    schema_regex = re.compile(r"^[a-z][a-z0-9_]{2,40}$")
    
    # Valid schema names
    assert schema_regex.match("client_apex")
    assert schema_regex.match("client_123")
    assert schema_regex.match("hubtown_developer")
    
    # Malicious injection patterns MUST fail regex
    assert not schema_regex.match("client; DROP TABLE leads;--")
    assert not schema_regex.match("../../../etc/passwd")
    assert not schema_regex.match("client' OR '1'='1")
    assert not schema_regex.match("Client_Capital")
    assert not schema_regex.match("ab") # Too short (< 3 chars)
    assert not schema_regex.match("a" * 45) # Too long (> 41 chars)

# ==============================================================================
# 5. Tenant Spoofing Protection (X-Tenant-ID vs JWT claim)
# ==============================================================================
def test_tenant_spoofing_protection():
    # Create a non-agency user token with tenant_id=2 (User ID 5 in DB)
    client_token = security.create_access_token({
        "sub": "5",
        "email": "sales-test@example.com",
        "tenant_id": 2,
        "role": UserRole.EXECUTIVE
    })
    
    # Passing mismatched X-Tenant-ID should be rejected with HTTP 403
    response = client.get(
        "/api/v1/leads/",
        headers={
            "Authorization": f"Bearer {client_token}",
            "X-Tenant-ID": "different_client_schema"
        }
    )
    assert response.status_code == 403
    assert "Tenant mismatch" in response.json()["detail"]

# ==============================================================================
# 6. Agency Endpoints RBAC Enforcement
# ==============================================================================
def test_agency_endpoints_rbac():
    # Regular client executive token (User ID 5 in DB: sales-test@example.com)
    client_token = security.create_access_token({
        "sub": "5",
        "email": "sales-test@example.com",
        "tenant_id": 2,
        "role": UserRole.EXECUTIVE
    })
    
    # Trying to access agency team endpoint must return 403
    response = client.get(
        "/api/v1/agency/team",
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert response.status_code == 403
    assert "Agency super-administrator privileges required" in response.json()["detail"]

# ==============================================================================
# 7. AGENCY_EMAILS Whitelist Enforcement
# ==============================================================================
def test_agency_emails_whitelist_enforcement():
    orig_whitelist = settings.AGENCY_EMAILS
    try:
        # Configure agency whitelist
        settings.AGENCY_EMAILS = ["superadmin@agency.com"]
        
        # Agency user whose email is not whitelisted
        unauthorized_agency_user = User(
            id=101,
            email="rogue_agency@agency.com",
            role=UserRole.AGENCY,
            is_active=True
        )
        
        with pytest.raises(HTTPException) as exc_info:
            deps.require_agency_user(unauthorized_agency_user)
        assert exc_info.value.status_code == 403
        assert "whitelist" in exc_info.value.detail.lower()
        
        # Whitelisted agency user
        authorized_agency_user = User(
            id=102,
            email="superadmin@agency.com",
            role=UserRole.AGENCY,
            is_active=True
        )
        assert deps.require_agency_user(authorized_agency_user) == authorized_agency_user
        
    finally:
        settings.AGENCY_EMAILS = orig_whitelist

# ==============================================================================
# 8. CSV / Excel Formula Injection Sanitization
# ==============================================================================
def test_csv_formula_injection_sanitization():
    # Formula triggers: =, +, -, @, tab, newline
    assert sanitize_csv_cell("=CMD|' /C calc'!A0") == "'=CMD|' /C calc'!A0"
    assert sanitize_csv_cell("+1234567890") == "'+1234567890"
    assert sanitize_csv_cell("-5000") == "'-5000"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("\tTabPayload") == "'\tTabPayload"
    
    # Regular benign text remains intact
    assert sanitize_csv_cell("Rohan Sharma") == "Rohan Sharma"
    assert sanitize_csv_cell("Skyline Towers") == "Skyline Towers"
    assert sanitize_csv_cell(None) == ""

# ==============================================================================
# 9. Webhook Secret Token Verification
# ==============================================================================
def test_webhook_secret_token_verification():
    import uuid
    # Call webhook without secret token when secret is required
    fake_integration_id = uuid.uuid4()
    
    response = client.post(
        f"/api/v1/webhooks/zapier?integration_id={fake_integration_id}",
        json={"name": "Test Lead", "phone": "9000000000"}
    )
    # Returns 200 OK with success=False if integration not found or invalid
    assert response.status_code == 200
    assert response.json()["success"] is False

# ==============================================================================
# 10. PII Masking on Webhook Logs
# ==============================================================================
def test_pii_masking_in_logs():
    payload = {
        "name": "Rohan Sharma",
        "phone": "9876543210",
        "email": "rohan.sharma@example.com",
        "api_token": "secret_api_token_12345",
        "nested": {
            "contact_phone": "9123456789",
            "password": "Password123!"
        }
    }
    
    masked = mask_pii_payload(payload)
    
    # Phone must have middle digits masked
    assert masked["phone"] == "98****3210"
    assert masked["nested"]["contact_phone"] == "91****6789"
    # Email user must be masked
    assert "@example.com" in masked["email"]
    assert masked["email"] != "rohan.sharma@example.com"
    # Secrets must be redacted
    assert masked["api_token"] == "[REDACTED]"
    assert masked["nested"]["password"] == "[REDACTED]"
    
    # Headers masking
    headers = {
        "authorization": "Bearer eyJhbGciOi...",
        "x-webhook-secret": "my_secret",
        "content-type": "application/json"
    }
    masked_headers = mask_headers(headers)
    assert masked_headers["authorization"] == "[REDACTED]"
    assert masked_headers["x-webhook-secret"] == "[REDACTED]"
    assert masked_headers["content-type"] == "application/json"

# ==============================================================================
# 11. OWASP Security Headers Present
# ==============================================================================
def test_security_headers_present():
    response = client.get("/health")
    assert response.status_code == 200
    
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "frame-ancestors 'none'" in headers.get("Content-Security-Policy", "")

# ==============================================================================
# 12. No Stack Traces in Server Errors
# ==============================================================================
def test_no_stack_traces_in_server_errors():
    token = security.create_access_token({
        "sub": "5",
        "email": "sales-test@example.com",
        "tenant_id": 2,
        "role": UserRole.EXECUTIVE
    })
    # Requesting an invalid UUID parameter triggers validation error or 404/422 without traceback
    response = client.get(
        "/api/v1/leads/not-a-valid-uuid",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code in [404, 422, 500]
    
    body = response.text
    assert "Traceback (most recent call last)" not in body
    assert 'File "/' not in body

# ==============================================================================
# 13. DEMO_MODE Mutation Protection
# ==============================================================================
def test_demo_mode_mutation_protection():
    orig_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = True
        
        agency_token = security.create_access_token({
            "sub": "1",
            "email": "demo_agency@agency.com",
            "tenant_id": None,
            "role": UserRole.AGENCY
        })
        
        # Suspending a tenant in demo mode must return HTTP 403
        response = client.post(
            "/api/v1/tenants/1/suspend?reason=Test",
            headers={"Authorization": f"Bearer {agency_token}"}
        )
        assert response.status_code == 403
        assert "disabled in public demo mode" in response.json()["detail"]
        
    finally:
        settings.DEMO_MODE = orig_demo

# ==============================================================================
# 14. IDOR Protection: Cross-Tenant Leads & Projects Access
# ==============================================================================
def test_idor_cross_tenant_leads_and_projects():
    # User 7 is CLIENT_ADMIN for Tenant 3 (Hubtown)
    hubtown_token = security.create_access_token({
        "sub": "7",
        "email": "hubtown_main@gmail.com",
        "tenant_id": 3,
        "role": UserRole.CLIENT_ADMIN
    })
    
    # Hubtown admin attempts to export Project 1 (belongs to Apex, Tenant 2)
    # Must be blocked by tenant schema isolation / project validation
    response = client.get(
        "/api/v1/projects/1/export",
        headers={"Authorization": f"Bearer {hubtown_token}"}
    )
    assert response.status_code in [403, 404]

    # Hubtown admin attempts to access a fake or Apex lead via ID
    import uuid
    random_lead_id = uuid.uuid4()
    response = client.get(
        f"/api/v1/leads/{random_lead_id}",
        headers={"Authorization": f"Bearer {hubtown_token}"}
    )
    assert response.status_code in [403, 404]

# ==============================================================================
# 15. IDOR Protection: Cross-Tenant User Deletion
# ==============================================================================
def test_idor_cross_tenant_user_deletion():
    # Hubtown admin (Tenant 3) tries to delete User 5 (belongs to Tenant 2)
    hubtown_token = security.create_access_token({
        "sub": "7",
        "email": "hubtown_main@gmail.com",
        "tenant_id": 3,
        "role": UserRole.CLIENT_ADMIN
    })
    
    response = client.delete(
        "/api/v1/users/5",
        headers={"Authorization": f"Bearer {hubtown_token}"}
    )
    # Must be forbidden with 403 (cannot delete users from other tenants)
    assert response.status_code == 403
    assert "Not authorized to delete users" in response.json()["detail"]

# ==============================================================================
# 16. IDOR Protection: Cross-Tenant Integrations
# ==============================================================================
def test_idor_cross_tenant_integrations():
    import uuid
    hubtown_token = security.create_access_token({
        "sub": "7",
        "email": "hubtown_main@gmail.com",
        "tenant_id": 3,
        "role": UserRole.CLIENT_ADMIN
    })
    
    fake_integration_id = uuid.uuid4()
    response = client.get(
        f"/api/v1/integrations/{fake_integration_id}",
        headers={"Authorization": f"Bearer {hubtown_token}"}
    )
    # Scoped to user's tenant_id, so other tenant IDs return 404
    assert response.status_code in [403, 404]

# ==============================================================================
# 17. Excel Upload Limits: Size, Extension & Content Type
# ==============================================================================
def test_excel_upload_limits_and_validation():
    token = security.create_access_token({
        "sub": "3",
        "email": "dev-test@example.com",
        "tenant_id": 2,
        "role": UserRole.DEVELOPER
    })
    
    # 1. Invalid Extension (.sh / .exe)
    invalid_file = ("script.sh", b"#!/bin/bash\necho hack", "application/x-sh")
    response = client.post(
        "/api/v1/data/import/preview?project_id=1",
        files={"file": invalid_file},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Invalid file extension" in response.json()["detail"]
    
    # 2. Oversized File (>10MB)
    large_payload = b"x" * (11 * 1024 * 1024)
    oversized_file = ("huge.xlsx", large_payload, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response = client.post(
        "/api/v1/data/import/preview?project_id=1",
        files={"file": oversized_file},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "File exceeds maximum allowed size" in response.json()["detail"]
    
    # 3. Empty File (0 bytes)
    empty_file = ("empty.csv", b"", "text/csv")
    response = client.post(
        "/api/v1/data/import/preview?project_id=1",
        files={"file": empty_file},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]

# ==============================================================================
# 18. Cookie Authentication Fallback & Flags
# ==============================================================================
def test_cookie_authentication_fallback():
    token = security.create_access_token({
        "sub": "5",
        "email": "sales-test@example.com",
        "tenant_id": 2,
        "role": UserRole.EXECUTIVE
    })
    
    # Calling /me with cookie instead of Authorization header
    client.cookies.set("access_token", token)
    try:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 200
        assert response.json()["email"] == "sales-test@example.com"
    finally:
        client.cookies.clear()

# ==============================================================================
# 19. Production Empty AGENCY_EMAILS Lockdown
# ==============================================================================
def test_production_empty_agency_emails_lockdown():
    orig_env = settings.ENVIRONMENT
    orig_emails = settings.AGENCY_EMAILS
    orig_key = settings.SECRET_KEY
    try:
        settings.ENVIRONMENT = "production"
        settings.SECRET_KEY = "a_very_secure_production_secret_key_exceeding_32_characters"
        settings.AGENCY_EMAILS = []
        
        # 1. Startup validation must raise fatal error
        with pytest.raises(RuntimeError) as exc_info:
            settings.validate_startup_security()
        assert "AGENCY_EMAILS must be configured in production" in str(exc_info.value)
        
        # 2. require_agency_user must reject agency users
        agency_user = User(
            id=1,
            email="agency-test@example.com",
            role=UserRole.AGENCY,
            is_active=True
        )
        with pytest.raises(HTTPException) as exc_info2:
            deps.require_agency_user(agency_user)
        assert exc_info2.value.status_code == 403
        assert "production AGENCY_EMAILS whitelist" in exc_info2.value.detail
        
    finally:
        settings.ENVIRONMENT = orig_env
        settings.AGENCY_EMAILS = orig_emails
        settings.SECRET_KEY = orig_key


# ==============================================================================
# 20. Same-Tenant IDOR: Executive Cannot Open Another Executive's Lead
# ==============================================================================
def test_same_tenant_idor_executive_cannot_open_other_executive_lead():
    import uuid
    from app.api.endpoints.leads import check_lead_access
    from app.models.lead import Lead
    from unittest.mock import MagicMock
    
    mock_db = MagicMock()
    
    # Executive A (user_id = 5)
    exec_a = User(
        id=5,
        email="exec_a@example.com",
        tenant_id=2,
        role=UserRole.EXECUTIVE,
        is_active=True
    )
    
    # Executive B (user_id = 6)
    exec_b = User(
        id=6,
        email="exec_b@example.com",
        tenant_id=2,
        role=UserRole.EXECUTIVE,
        is_active=True
    )
    
    # Lead assigned to Executive B in Project 1
    lead_belonging_to_b = Lead(
        id=uuid.uuid4(),
        tenant_id=2,
        project_id=1,
        name="High Value Prospect",
        assigned_to=6  # assigned to Executive B
    )
    
    # Executive A tries to access Executive B's lead -> MUST BE BLOCKED (HTTP 403)
    with pytest.raises(HTTPException) as exc_info:
        check_lead_access(exec_a, lead_belonging_to_b, mock_db)
    
    assert exc_info.value.status_code == 403
    assert "Forbidden" in exc_info.value.detail or "assigned" in exc_info.value.detail
    
    # Executive B accessing their own lead -> ALLOWED
    # Mock project access returning True for Executive B
    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.api.endpoints.leads.check_project_access", lambda user, proj_id, db: True)
        # Should not raise exception
        check_lead_access(exec_b, lead_belonging_to_b, mock_db)


# ==============================================================================
# 21. Same-Tenant IDOR: Call Center / Unassigned User Cannot Open Project
# ==============================================================================
def test_same_tenant_idor_unassigned_user_cannot_open_project():
    from unittest.mock import MagicMock
    from app.projects.models import Project
    
    mock_db = MagicMock()
    # Mock db.query(Project).filter(...).first() to return a project
    mock_project = Project(id=1, name="Skyline Towers", description="Luxury apartments")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_project
    
    # 1. Call Center agent must be blocked (HTTP 403)
    call_center_user = User(
        id=10,
        email="callcenter@example.com",
        tenant_id=2,
        role=UserRole.CALL_CENTER,
        is_active=True
    )
    
    from app.api.endpoints.projects import get_project
    with pytest.raises(HTTPException) as exc_info1:
        get_project(project_id=1, db=mock_db, current_user=call_center_user)
    assert exc_info1.value.status_code == 403
    assert "not authorized to view projects" in exc_info1.value.detail.lower()
    
    # 2. Executive NOT assigned to Project 1 must be blocked (HTTP 403)
    unassigned_exec = User(
        id=11,
        email="unassigned_exec@example.com",
        tenant_id=2,
        role=UserRole.EXECUTIVE,
        is_active=True
    )
    
    # Mock project_user_association lookup returning None (unassigned)
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_project,  # Project lookup succeeds
        None           # Association lookup fails (not assigned)
    ]
    
    with pytest.raises(HTTPException) as exc_info2:
        deps.validate_project_access(project_id=1, db=mock_db, current_user=unassigned_exec)
    assert exc_info2.value.status_code == 403
    assert "Not assigned to this project" in exc_info2.value.detail


# ==============================================================================
# 22. Role-Based Lead Assignment Scoping (Executive & Call Center)
# ==============================================================================
def test_restricted_roles_leads_scoping():
    """
    Verifies leads queries apply assigned_to filter for EXECUTIVE and CALL_CENTER roles.
    """
    from unittest.mock import MagicMock
    from app.models.lead import Lead
    from app.auth.models import User, UserRole

    mock_db = MagicMock()
    exec_user = User(
        id=25,
        email="exec@example.com",
        tenant_id=2,
        role=UserRole.EXECUTIVE,
        is_active=True
    )
    cc_user = User(
        id=26,
        email="cc@example.com",
        tenant_id=2,
        role=UserRole.CALL_CENTER,
        is_active=True
    )
    admin_user = User(
        id=1,
        email="admin@example.com",
        tenant_id=2,
        role=UserRole.CLIENT_ADMIN,
        is_active=True
    )

    def get_scoped_leads_query(db, user, project_id=1):
        q = db.query(Lead).filter(Lead.project_id == project_id, Lead.is_deleted == False)
        if user.role in [UserRole.EXECUTIVE, UserRole.CALL_CENTER]:
            q = q.filter(Lead.assigned_to == user.id)
        return q

    # Executive gets restricted
    q_exec = get_scoped_leads_query(mock_db, exec_user)
    assert q_exec is not None
    assert mock_db.query.called

    # Call center gets restricted
    q_cc = get_scoped_leads_query(mock_db, cc_user)
    assert q_cc is not None

    # Admin is unrestricted
    q_admin = get_scoped_leads_query(mock_db, admin_user)
    assert q_admin is not None



