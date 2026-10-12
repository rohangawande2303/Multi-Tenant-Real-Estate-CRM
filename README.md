# Social Pulse - Multi-Tenant Real Estate CRM

[![CI Pipeline](https://github.com/rohangawande2303/Multi-Tenant-Real-Estate-CRM/actions/workflows/ci.yml/badge.svg)](https://github.com/rohangawande2303/Multi-Tenant-Real-Estate-CRM/actions)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-ready, multi-tenant Real Estate Customer Relationship Management (CRM) platform engineered for digital agencies and real estate developers. Designed to manage lead pipelines, inbound advertising webhooks, multi-project inventory, and telecalling operations across isolated client organizations.

---

## Architecture Highlights

- **Schema-Per-Tenant Isolation**: Complete physical data separation using dedicated PostgreSQL schemas (`client_<tenant>`) resolved dynamically per request.
- **Hybrid SQL + JSONB Lead Store**: Fast indexed search on core attributes (`phone`, `email`, `project_id`, `status`) coupled with a dynamic 200+ column JSONB store for custom real estate attributes.
- **Granular Role-Based Access Control (RBAC)**: Agency Administrators, Client Developers, Sales Managers, Sales Executives, and Call Center agents with strict lead assignment and project-scoping boundaries.
- **Inbound Webhook Engine**: High-throughput webhook ingestion for Google Ads, Meta Ads, and Zapier with secret token verification, rate limiting, and deduplication (`phone + project_id`).
- **Defensive Security**: Formula injection protection, PII masking in audit logs, brute-force login lockout, and OWASP security headers.

```
                           +---------------------------+
                           |  Next.js 15 App Router    |
                           |  (Vercel Edge Deployment) |
                           +-------------+-------------+
                                         |
                                         | HTTPS /api/v1/* (Proxy / Rewrites)
                                         v
                           +---------------------------+
                           |      FastAPI Backend      |
                           |   (Render Docker Web)     |
                           +-------------+-------------+
                                         |
                                         | Direct Connection (Non-Pooled SSL)
                                         v
                           +---------------------------+
                           |    PostgreSQL Database    |
                           |    (Neon Serverless)      |
                           +-------------+-------------+
                             |           |           |
                      +------+------+ +--+---+ +-----+-------+
                      |   public    | | demo | |  tenant_b   |
                      |  (Agencies) | | CRM  | |  (Isolated) |
                      +-------------+ +------+ +-------------+
```

---

## Live Demo

> **Live Application URL**: [[https://multi-tenant-real-estate-crm-fronte.vercel.app/]](https://[YOUR_LIVE_URL])  
> **API Documentation**: [[YOUR_API_DOCS_URL]](https://[YOUR_BACKEND_URL]/docs)  
> *Note: Hosted on free-tier infrastructure. If idle, the backend server may take 30–50 seconds to spin up from cold sleep.*

### Demo Credentials (Pre-seeded with "Demo Realty")

| Role | Email | Password | Access Scope |
|------|-------|----------|--------------|
| **Agency Super Admin** | `demo_admin@socialpulse.agency` | *Set via `DEMO_PASSWORD`* | Global Agency, all tenants, provisioning |
| **Developer / Client Admin** | `demo_dev@demorealty.com` | *Set via `DEMO_PASSWORD`* | Demo Realty tenant, all projects & users |
| **BD / Sales Manager** | `demo_bd@demorealty.com` | *Set via `DEMO_PASSWORD`* | Assigned projects, all leads in projects |
| **Sales Executive** | `demo_exec@demorealty.com` | *Set via `DEMO_PASSWORD`* | Only leads explicitly assigned to executive |
| **Call Center Agent** | `demo_cc@demorealty.com` | *Set via `DEMO_PASSWORD`* | Assigned telecalling leads & dispositions |

*Demo data is synthetic and reset periodically.*

---

## Screenshots

| Lead Pipeline & Table View | Project Analytics Dashboard |
|:---:|:---:|
| ![Lead Pipeline](docs/screenshots/leads_view.png) | ![Analytics Dashboard](docs/screenshots/dashboard.png) |

| Inbound Webhook Integrations | Role-Based User Management |
|:---:|:---:|
| ![Integrations](docs/screenshots/integrations.png) | ![User Management](docs/screenshots/users.png) |

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11) with Starlette & Pydantic v2
- **Database ORM**: SQLAlchemy 2.0 with Alembic database migrations
- **Driver**: Psycopg2-binary (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens) with Passlib & Bcrypt password hashing
- **Testing**: Pytest with automated regression and security test suites

### Frontend
- **Framework**: Next.js 15 (App Router) with React 19 & TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **State & Data**: Axios with automatic CSRF/token interceptors
- **Visuals**: Recharts for real estate sales analytics

### Cloud Infrastructure
- **Database**: Neon Serverless PostgreSQL (Direct non-pooled connection)
- **API Server**: Render (Docker Web Service)
- **Frontend App**: Vercel
- **Uptime Monitoring**: UptimeRobot (pings `/health` endpoint)

---

## Local Development Setup

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/[YOUR_GITHUB_USERNAME]/sp-crm.git
   cd sp-crm
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start services**:
   ```bash
   docker-compose up -d --build
   ```

4. **Seed demo environment**:
   ```bash
   docker exec -it sp_crm_backend python -m scripts.seed_demo
   ```

5. **Access services**:
   - Web Application: [http://localhost:3000](http://localhost:3000)
   - FastAPI Interactive Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Database: `localhost:5432` (`postgres:postgres`)

---

### Option 2: Bare Metal Setup

#### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Testing & Quality Assurance

Run the comprehensive test suite (28 passing tests covering multi-tenancy, authentication, IDOR, CSV sanitization, and role scoping):

```bash
cd backend
pytest tests/ -v
```

---

## Project Roadmap

- [x] Schema-per-tenant multi-tenant architecture
- [x] Inbound webhook integrations (Google Ads, Meta Ads, Zapier)
- [x] Role-Based Access Control (RBAC) with IDOR protections
- [x] Real-time activity audit logging & PII masking
- [ ] Single-client deployment mode *(Planned)*
- [ ] Tiered subscription billing & Stripe integration *(Planned)*
- [ ] Upgrade dev-tooling to Tailwind CSS 4 & Next.js 16 *(Planned)*

---

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Click-by-click production deployment on Neon, Render, and Vercel.
- [Architecture & System Design](docs/architecture.md) - Deep dive into multi-tenancy, schema switching, and data flow.
- [Security Policy](SECURITY.md) - Vulnerability disclosure process and defense-in-depth specifications.

---

## Author & Maintainer

Maintained by **Rohan Gawande**.  
GitHub: [@rohangawande2303](https://github.com/rohangawande2303)
