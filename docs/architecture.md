# Architecture & System Design

Social Pulse Real Estate CRM is a high-performance, multi-tenant lead management and sales operations platform engineered for real estate agencies and property developers.

---

## 1. High-Level Architecture Overview

```
                      +-----------------------------+
                      |   Next.js 15 Client (App)   |
                      |   (Vercel Deployed CDN)     |
                      +--------------+--------------+
                                     |
                                     | HTTPS /api/v1/* (Rewrites / Proxy)
                                     v
                      +-----------------------------+
                      |    FastAPI Backend Server   |
                      |    (Render Container)       |
                      +--------------+--------------+
                                     |
                                     | Direct connection (Non-pooled SSL)
                                     v
                      +-----------------------------+
                      |    PostgreSQL Database      |
                      |    (Neon Serverless)        |
                      +-----------------------------+
                       |              |            |
                +------+------+ +-----+-----+ +----+--------+
                | public      | | client_a  | | client_demo |
                | (Tenants,   | | (Leads,   | | (Leads,     |
                |  Users,     | |  Projects,| |  Projects,  |
                |  Agencies)  | |  Logs)    | |  Logs)      |
                +-------------+ +-----------+ +-------------+
```

---

## 2. Multi-Tenancy Architecture: Schema-Per-Tenant

The platform employs a **schema-per-tenant** model in PostgreSQL:

1. **Shared Public Schema (`public`)**:
   - `tenants`: Client organizations with status, domain, and database schema mappings.
   - `users`: Agency administrators and global client credentials.
   - `user_activity_logs`: Global audit trails.

2. **Isolated Tenant Schemas (`client_<subdomain>`)**:
   - `leads`: Project-specific leads combining core SQL indexed columns with flexible JSONB dynamic fields.
   - `projects`: Developer projects managed under the specific tenant.
   - `integrations`: Inbound webhook endpoints (Meta Ads, Google Ads, Zapier, Web forms).
   - `project_assignments`: Role bindings mapping sales executives and call center agents to specific projects.

3. **Schema Switching Mechanism**:
   - Resolved automatically per request using JWT tenant claims or verified `X-Tenant-ID` headers.
   - Schema search paths are safely set via `SET search_path TO client_<name>, public` on dedicated sessions.
   - **Direct Connection Requirement**: Connection poolers operating in transaction mode (e.g., PgBouncer) break schema state across statements. The platform requires direct non-pooled connections to ensure complete schema isolation.

---

## 3. Data Ingestion & Storage Architecture

### Hybrid SQL + JSONB Lead Storage
Real estate workflows require tracking over 200 customer data points while maintaining high query performance:
- **Core SQL Columns**: Primary indices for high-frequency search and filtering (`id`, `name`, `phone`, `email`, `project_id`, `assigned_to`, `lead_rating`, `status`, `created_at`).
- **Dynamic JSONB Column (`custom_fields`)**: Captures detailed demographics, possession timelines, preferences, and legacy spreadsheet columns without costly DDL migrations.

### Inbound Ingestion Pipeline
```
[Webhook Source] ---> [HMAC / Secret Auth] ---> [Rate Limiter] ---> [Deduplication Engine] ---> [Tenant DB]
                                                                     (phone + project_id)
```

1. **Authentication**: Token verification and optional payload signature validation.
2. **Rate Limiting**: Per-integration sliding window throttling.
3. **Deduplication**: Unique constraint evaluation on `(phone, project_id)`.
4. **Audit Trail**: Action recorded in `user_activity_logs` with sensitive PII automatically masked.

---

## 4. Role-Based Access Control (RBAC) Hierarchy

The CRM enforces strict role-based data visibility:

| Role | Scope | Lead Visibility |
|------|-------|-----------------|
| `AGENCY_ADMIN` / `AGENCY` | Cross-Tenant Super Admin | All tenants, all projects, all leads |
| `DEVELOPER` / `CLIENT_ADMIN` | Tenant Scope | All projects and leads within tenant |
| `SALES_MANAGER` | Project Scope | All leads across assigned projects |
| `EXECUTIVE` | User Scope | Only leads explicitly assigned to them |
| `CALL_CENTER` | User Scope | Only leads explicitly assigned for telecalling |
