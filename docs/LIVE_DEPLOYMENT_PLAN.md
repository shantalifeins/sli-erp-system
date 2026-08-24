# 🚀 Live Server Deployment & MCP Integration Plan

This document outlines the complete server analysis, dual-authentication strategy, environment variable configurations, and MCP guardrails for deploying the **SLI ERP System** to the live production server (`ssl-uat-ims02`) without altering existing services (Chatwoot, n8n, etc.).

---

## 📌 1. Server Analysis Baseline

- **Server OS**: Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- **Runtimes & Containers**:
  - Node.js: `v18.20.8`
  - npm: `10.8.2`
  - Docker: `29.6.2`
- **Database Engine**:
  - `postgres_prod` Docker container running PostgreSQL listening on `0.0.0.0:5432` / `localhost:5432`.
  - Existing isolated databases: `chatwoot_db` (owner: `chatwoot_user`), `n8n_db` (owner: `n8n_user`).
- **Web Reverse Proxy & SSL**:
  - `Apache2` active, managing Let's Encrypt SSL and proxying requests for virtual hosts (`sli_chatwoot.conf`, `sli_n8n.conf`, etc.).

---

## 🔒 2. Dual-Authentication Strategy

To avoid installing Supabase on the live server while maintaining Supabase for local development and Vercel testing:

1. **Local PC / Vercel (`AUTH_MODE=supabase`)**:
   - Uses Supabase Auth (`@supabase/supabase-js`) for user authentication and session management.
   - Database connection points to Supabase PostgreSQL.

2. **Live Production Server (`AUTH_MODE=postgres`)**:
   - Bypasses Supabase Auth API calls entirely.
   - The Express backend (`server.ts`) handles login requests via direct PostgreSQL queries against the `users` table.
   - Express issues signed JWT tokens using `jsonwebtoken` and a custom `JWT_SECRET`.
   - The existing `auth.ts` middleware verifies tokens offline via `jwt.verify(token, JWT_SECRET)`.

---

## 🌐 3. Environment Variables Comparison (.env)

### A. Local PC / Vercel Environment File (`.env`)
```ini
# Operating Mode
AUTH_MODE=supabase
NODE_ENV=development

# Application Port & URLs
PORT=5000
VITE_API_URL=http://localhost:5000

# Supabase Auth & Database (Local & Vercel)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# PostgreSQL Database Connection (Supabase Pooler / Direct)
DATABASE_URL=postgres://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# CORS & Tenant
FRONTEND_URL=http://localhost:5173
```

---

### B. Live Production Server Environment File (`.env.production`)
```ini
# Operating Mode
AUTH_MODE=postgres
NODE_ENV=production

# Application Port & URLs
PORT=5000
VITE_API_URL=https://erp.shantalife.com

# JWT Secret for Direct Express Auth (No Supabase required)
JWT_SECRET=production_ultra_secure_jwt_secret_key_2026

# PostgreSQL Direct Connection (Connecting to postgres_prod container)
DATABASE_URL=postgres://sli_erp_user:secure_sli_password_2026@127.0.0.1:5432/sli_erp_db

# CORS & Security
FRONTEND_URL=https://erp.shantalife.com
```

---

## 🗄️ 4. Isolated Database Setup (Zero Impact on Chatwoot)

Execute once inside the `postgres_prod` container on the live server:

```sql
CREATE USER sli_erp_user WITH PASSWORD 'secure_sli_password_2026';
CREATE DATABASE sli_erp_db OWNER sli_erp_user;
GRANT ALL PRIVILEGES ON DATABASE sli_erp_db TO sli_erp_user;
```

---

## 🛡️ 5. MCP Deployment Server & Guardrails

An MCP Deployment Server (`scripts/mcp-deploy-server.ts`) will be integrated into the repository to enable IDE-based automated deployments via SSH/Tokens.

### Allowed Actions (MCP Capabilities)
- `git_pull_and_deploy`: Triggers `git fetch && git pull origin main`, builds code, and restarts `sli_erp_app` container on remote server. (Direct local-to-remote file copy is forbidden).
- `run_remote_migrations`: Run `drizzle-kit push` strictly against `sli_erp_db`.
- `check_server_health`: View logs and status of `sli_erp_app` container and port 5000.
- `reload_apache_config`: Create/update `/etc/apache2/sites-available/sli_erp.conf` and run `systemctl reload apache2`.

### Strict Workflow Mandate
> [!IMPORTANT]
> **Git-Centric Deployment**: All local changes MUST be committed and pushed to the Git repository first. The MCP server will strictly pull from Git on the remote server (`git pull origin main`). Direct pushing/copying of code from PC to server is disabled to ensure full version control auditing.

### Forbidden Actions (Strict MCP Guardrails)
- ❌ **No Access to Chatwoot/n8n**: Any query or command referencing `chatwoot_db`, `n8n_db`, or `postgres` system tables will be intercepted and rejected.
- ❌ **No Access to Other Containers**: Cannot stop, restart, or alter `chatwoot_app`, `chatwoot_worker`, `n8n_prod`, `redis_prod`, `metabase_dev`, or `mariadb`.
- ❌ **No Destructive Global Commands**: Commands containing `docker system prune`, `rm -rf /`, `drop database`, or `reboot` will fail validation.

---

## 🌐 6. Apache Reverse Proxy Configuration (`/etc/apache2/sites-available/sli_erp.conf`)

```apache
<VirtualHost *:443>
    ServerName erp.shantalife.com
    ServerAdmin info@shantalife.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Ssl on

    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/

    ErrorLog ${APACHE_LOG_DIR}/sli_erp_error.log
    CustomLog ${APACHE_LOG_DIR}/sli_erp_access.log combined

    Include /etc/letsencrypt/options-ssl-apache.conf
    SSLCertificateFile /etc/letsencrypt/live/erp.shantalife.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/erp.shantalife.com/privkey.pem
</VirtualHost>

<VirtualHost *:80>
    ServerName erp.shantalife.com
    Redirect permanent / https://erp.shantalife.com/
</VirtualHost>
```

---

## 🔄 7. Proposed Implementation Roadmap

### Phase 1: Dual-Auth & Express Native Login Implementation
- Add `AUTH_MODE` support in `server.ts` and `auth.ts`.
- Implement `/api/auth/login` endpoint for PostgreSQL native authentication.

### Phase 2: MCP Deployment Server Script & Guardrail Validator
- Create `scripts/mcp-deploy-server.ts` using `@modelcontextprotocol/sdk`.
- Add command validation middleware to enforce safety rules.

### Phase 3: Live Server DB Provisioning & Apache Config
- Create `sli_erp_db` and `sli_erp_user` in `postgres_prod`.
- Configure Apache virtual host `sli_erp.conf` and obtain Let's Encrypt SSL.

### Phase 4: First Automated MCP Deployment & Health Verification
- Trigger MCP deployment from local IDE.
- Verify container startup, Drizzle schema migration, and API response at `https://erp.shantalife.com`.

---

## 🧪 Verification Plan

### Automated Tests
- Run `npm run test` or API auth endpoint tests locally.
- Test JWT token generation and verification under `AUTH_MODE=postgres`.

### Manual Verification
- Test login with local Supabase setup (`AUTH_MODE=supabase`).
- Test login with direct Postgres setup (`AUTH_MODE=postgres`).
- Verify Chatwoot (`https://chatwoot.shantalife.com`) remains 100% operational during and after deployment.
