# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Social Pulse Multi-Tenant CRM seriously. If you discover a security vulnerability, please do NOT file a public issue on GitHub.

Instead, please send an email with full vulnerability details, reproduction steps, and proof-of-concept to:
**security@socialpulseagency.com** (or contact the repository maintainer privately).

You can expect an initial acknowledgment within 48 hours and regular updates on triage and mitigation.

---

## Security Architecture & Defenses

Social Pulse CRM implements layered defense-in-depth principles:

1. **Multi-Tenant Schema Isolation**:
   - Each client organization resides in an isolated PostgreSQL schema partition (`client_<name>`).
   - Dynamic schema resolution strictly validates identifiers against `^[a-z][a-z0-9_]{2,40}$` and applies PostgreSQL identifier quoting.
   - Cross-tenant header spoofing (`X-Tenant-ID`) is validated against authenticated JWT claims and rejected with HTTP 403.

2. **Role-Based Access Control (RBAC)**:
   - Super-admin agency endpoints (`/agency/*`, `/tenants/*`) require verified agency roles and strict `AGENCY_EMAILS` whitelist checks.
   - In production mode (`ENVIRONMENT=production`), an empty or missing `AGENCY_EMAILS` configuration aborts application startup to prevent open access.
   - Project-level authorization prevents unauthorized users within a tenant from viewing or mutating unassigned projects.

3. **Inbound Webhook Verification & PII Protection**:
   - Webhook integrations (Meta Ads, Google Ads, Zapier, Web forms) enforce cryptographic HMAC signature verification and secret token matching.
   - PII (phone numbers, email addresses, secret headers) is automatically masked prior to persistence in audit logs.
   - Webhook endpoints enforce per-integration rate limiting.

4. **Formula & CSV Injection Mitigation**:
   - Data exported to CSV/Excel is sanitized by prefixing cell values starting with `=, +, -, @, \t, \r` with a single apostrophe (`'`), preventing code execution when opened in spreadsheet software.

5. **Upload Boundaries & Restrictions**:
   - Lead import file uploads are strictly limited to `.xlsx` and `.csv` extensions, validated against allowed MIME types, and enforced with a 10MB maximum payload limit.

6. **Authentication Security, Tokens & Lockout**:
   - Password hashing strictly uses `bcrypt` with cryptographically secure salts.
   - JWT tokens include expiration timestamps (`ACCESS_TOKEN_EXPIRE_MINUTES`) and can be transmitted via Bearer headers or `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
   - Brute-force login attempts are tracked and trigger automatic account lockout with `HTTP 429 Too Many Requests` after 5 consecutive failures within a 15-minute window.
   - *Architecture Note*: Lockout tracking is currently in-memory (resets on container restart). Migration to a distributed Redis store is planned for multi-instance deployments.

7. **Hardened HTTP Security Headers**:
   - OWASP security headers enforced globally: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and strict `Content-Security-Policy` with `frame-ancestors 'none'`.
   - CORS is locked to explicitly configured domains (`ALLOWED_ORIGINS`), forbidding wildcards with credentials.

8. **Production Environment Guards**:
   - Startup validation refuses to boot if weak/default `SECRET_KEY` or empty `AGENCY_EMAILS` is detected when `ENVIRONMENT=production`.
   - `DEMO_MODE=true` locks down destructive administrative mutations (tenant deletions, project purges).

9. **Known Dev-Tooling Advisories & Upgrades Planned**:
   - 8 minor/moderate advisories remain in dev-tooling and build-time bundling dependencies (transitive AST/CSS parsing). These affect build scripts only, not runtime request pipelines.
   - Known dev-tooling advisories, upgrade to Tailwind 4 / Next 16 planned.

