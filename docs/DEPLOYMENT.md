# Production Deployment Guide: Social Pulse CRM

Complete deployment runbook for hosting Social Pulse CRM across free-tier production infrastructure:
- **Neon Serverless PostgreSQL** (Database with isolated schema partitions)
- **Render** (FastAPI Backend Docker web service)
- **Vercel** (Next.js 15 App Router Frontend)
- **UptimeRobot** (5-minute health check monitor preventing Render cold sleep)

---

## 1. Neon Database Setup (2 Minutes)

1. Sign up / Log in to [Neon Console](https://console.neon.tech).
2. Create a new Project named `social-pulse-crm`. Select a region close to your Render deployment (e.g. `US East / Ohio`).
3. Under **Dashboard > Connection Details**:
   - Choose **Direct Connection** (non-pooled).
   - Ensure the connection string ends with `?sslmode=require`.
   - **CRITICAL**: Do NOT select the connection pooling option (`-pooler`). Schema-per-tenant architecture requires PostgreSQL session-level `SET search_path`, which transaction-level PgBouncer pooling resets.
4. Copy your `DATABASE_URL`:
   ```text
   postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
   ```

---

## 2. Render Backend Deployment (3 Minutes)

1. Sign up / Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New + > Web Service** and select your GitHub repository.
3. Configure the service:
   - **Name**: `social-pulse-crm-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
   - **Health Check Path**: `/health`
4. Set Environment Variables:
   | Variable | Value / Description |
   | :--- | :--- |
   | `ENVIRONMENT` | `production` |
   | `DEMO_MODE` | `true` (protects demo records against deletions) |
   | `DATABASE_URL` | Your Neon DIRECT connection string |
   | `SECRET_KEY` | At least 32 characters (e.g. `openssl rand -hex 32`) |
   | `ALLOWED_ORIGINS` | `https://your-frontend-app.vercel.app` (add local dev if needed) |
   | `FRONTEND_URL` | `https://your-frontend-app.vercel.app` |
   | `AGENCY_EMAILS` | `demo_admin@socialpulse.agency` |
   | `DEMO_PASSWORD` | `DemoPass2026!` |
   | `WEBHOOK_SECRET` | Generate random token |
5. Click **Create Web Service**.
6. Render builds the Docker container, runs `alembic upgrade head` on startup, and exposes `/health`.
7. Note your live backend URL: `https://social-pulse-crm-backend.onrender.com`.

---

## 3. Seed Demo Data to Neon (1 Minute)

From your local machine or terminal, run the idempotent demo seed script targeting your live Neon database:

```bash
# In your terminal
export DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"
python scripts/seed_demo.py
```

This creates:
- Agency super-admin (`demo_admin@socialpulse.agency`)
- Demo Client tenant "Demo Realty Developers" (`client_demo_realty` schema)
- 4 role accounts (`client_admin`, `bd_manager`, `sales_exec`, `callcenter`)
- 2 Projects ("Aura Heights", "Zenith Park")
- 80 realistic Indian prospect leads with complete metadata

---

## 4. Vercel Frontend Deployment (2 Minutes)

1. Sign up / Log in to [Vercel](https://vercel.com).
2. Click **Add New... > Project** and import the GitHub repository.
3. In Project Configuration:
   - **Root Directory**: Click edit and select `frontend`.
   - **Framework Preset**: `Next.js`.
4. Configure Environment Variables:
   | Variable | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://social-pulse-crm-backend.onrender.com/api/v1` |
   | `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | `true` |
5. Click **Deploy**.
6. Vercel compiles the static pages and sets up edge caching.
7. Copy your Vercel deployment URL (e.g. `https://social-pulse-crm.vercel.app`).
8. Return to Render and update `ALLOWED_ORIGINS` and `FRONTEND_URL` with your exact Vercel URL.

---

## 5. UptimeRobot Ping Monitor (1 Minute)

Render's free tier spins down after 15 minutes of inactivity (causing ~30s cold starts). To keep it warm and responsive for portfolio visitors:

1. Create a free account at [UptimeRobot](https://uptimerobot.com).
2. Click **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Social Pulse CRM Backend`
   - **URL (or IP)**: `https://social-pulse-crm-backend.onrender.com/health`
   - **Monitoring Interval**: Every `5 minutes`
3. Click **Create Monitor**. The backend `/health` endpoint executes `SELECT 1` against the database to confirm full system readiness.

---

## 6. Verification Checklist

1. Open your live Vercel app in an incognito window.
2. Confirm the **Demo Access** box is visible on the login screen.
3. Click each demo role button and log in:
   - **Agency Super-Admin**: Access `/agency/analytics`, client onboarding, all tenants.
   - **Client Admin**: Access `/dashboard`, project settings, team member management.
   - **Sales Executive**: Scoped strictly to assigned leads and assigned projects.
   - **Call Center Agent**: Scoped strictly to assigned calling queues; unassigned projects return HTTP 403.
4. Verify lead creation, status changes, CSV export, and filtering.
