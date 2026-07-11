<p align="center">
  <img src="docs/assets/repos-logo.png" alt="RepOS" width="760">
</p>

# RepOS

RepOS is a customer support operating system prototype focused on cleaner ticket workflows, internal visibility, and practical support team tools.

It is built as a hands-on workflow prototype for exploring how support reps and admins can manage queues, customer context, ticket state, and internal support activity in one workspace.

## Why It Exists

Support work often spreads across tickets, notes, customer history, assignment decisions, saved replies, and team visibility tools. RepOS brings those pieces into a single prototype so support workflows are easier to scan, update, and reason about.

The current app uses an iSpring Water Systems demo workspace to model realistic customer support scenarios while keeping RepOS itself workspace-agnostic.

## Core Features

- Ticket workflow dashboard for open, assigned, and closed support work
- Cleaner support queue visibility with table and card-style views
- Internal support workspace with ticket detail, messages, notes, and customer context
- Ticket state tracking for status, ownership, priority, assignment, and follow-up work
- Admin tools for assignment users, workspace settings, and routing controls
- JSON-file persistence by default, with optional Postgres support through `DATABASE_URL`
- Local browser fallback state when the backend is unavailable
- Static Vercel demo path and Node-backed deployment path for backend demos

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- JSON-file persistence
- Optional Postgres through `pg`
- Vercel for static demo hosting
- Railway-compatible Node deployment path

## Local Development

Install dependencies:

```bash
npm install
```

Run the local server:

```bash
npm run dev
```

The app runs on:

```text
http://127.0.0.1:4173
```

Useful smoke check:

```bash
npm run smoke
```

## Runtime Safety

Auth mode is controlled by `TESSARIO_AUTH_MODE`:

The `TESSARIO_*` environment names are legacy compatibility aliases retained for existing deployments while the product-facing app name is RepOS.

- `development` keeps local convenience by auto-authenticating the seeded admin user.
- `demo` requires an explicit demo sign-in and does not silently create an admin session.
- `strict` disables dev/demo login, accepts valid existing sessions, and can issue sessions through `/api/auth/login` for configured users.

When `NODE_ENV=production` and no auth mode is set, RepOS defaults to `strict`. Production strict mode validates startup configuration before listening. It blocks startup when a strong session secret is missing, when dev/demo login would be exposed, or when neither an environment admin nor an active persisted password user is available.

The `/api/health` and `/api/session` responses include safe runtime flags for the active auth mode, automatic session behavior, dev/demo login availability, strict login readiness, session secret presence, secure cookie behavior, persistence mode, storage path classification, and Postgres mode. They do not expose admin emails, password hashes, session secrets, or database URLs.

Strict production login uses existing persisted auth users with `passwordHash` or an environment-provisioned initial admin:

```bash
NODE_ENV=production
TESSARIO_AUTH_MODE=strict
TESSARIO_DISABLE_DEV_LOGIN=1
TESSARIO_SESSION_DAYS=7
REPOS_SECURE_COOKIES=1
REPOS_SESSION_SECRET="use-at-least-32-random-characters"
REPOS_ADMIN_EMAIL=admin@example.com
REPOS_ADMIN_NAME="RepOS Admin"
REPOS_ADMIN_ROLE=admin
REPOS_ADMIN_PASSWORD="use-a-long-private-password"
```

`REPOS_ADMIN_PASSWORD` is hashed with Node's built-in `scrypt` before it is persisted. For stricter secret handling, provision `REPOS_ADMIN_PASSWORD_HASH` instead and omit the plain password from the runtime environment. `REPOS_SESSION_SECRET` or `TESSARIO_SESSION_SECRET` signs session cookies in strict deployments and must be a long random value with at least 32 characters. Do not use `development`, `demo`, or the default demo password for a real production workspace.

### Enterprise SSO

Enterprise SSO is optional and disabled unless `REPOS_SSO_ENABLED=true`. When enabled, RepOS uses OpenID Connect / OAuth 2.0 Authorization Code flow and signs users into the existing RepOS session system. Email/password and demo login remain available when your auth mode allows them.

Required environment variables:

```bash
REPOS_SSO_ENABLED=true
REPOS_SSO_ISSUER=https://your-identity-provider.example.com
REPOS_SSO_CLIENT_ID=your-client-id
REPOS_SSO_CLIENT_SECRET=your-client-secret
REPOS_SSO_REDIRECT_URI=https://your-repos-domain.com/api/auth/sso/callback
```

Optional environment variables:

```bash
REPOS_SSO_SCOPES="openid email profile"
REPOS_SSO_ALLOWED_DOMAINS=company.com,ispringfilter.com
```

Register the redirect URI with your identity provider exactly as configured in `REPOS_SSO_REDIRECT_URI`. RepOS never exposes `REPOS_SSO_CLIENT_SECRET` to the frontend, and it does not store provider access tokens in browser storage.

### Railway JSON Deployment

For Railway, set `NODE_ENV=production`, `TESSARIO_AUTH_MODE=strict`, `TESSARIO_DISABLE_DEV_LOGIN=1`, `REPOS_SECURE_COOKIES=1`, `REPOS_SESSION_SECRET`, and the `REPOS_ADMIN_*` variables in Railway environment variables. Mount a Railway volume and point JSON state and uploads at it:

```bash
TESSARIO_DATA_FILE=/data/tessario-state.json
TESSARIO_UPLOAD_DIR=/data/uploads
```

If these paths are left at `.data` and `.uploads`, Railway can restart on ephemeral filesystem state. RepOS will warn through startup logs and `/api/health`, but it will not migrate JSON state to Postgres in this pass.

Confirm a deployment with:

```bash
curl https://your-repos-app.example.com/api/health
```

Check that `auth.mode` is `strict`, `auth.devLogin` is `false`, `auth.strictLoginConfigured` is `true`, `auth.sessionSecretStrong` is `true`, `readiness.ready` is `true`, and `storage.dataFile.durable` is `true` when using a Railway volume.

### First Admin Setup And Rotation

For the first production boot, set `REPOS_ADMIN_EMAIL`, `REPOS_ADMIN_NAME`, `REPOS_ADMIN_ROLE`, and either `REPOS_ADMIN_PASSWORD` or `REPOS_ADMIN_PASSWORD_HASH`. Start RepOS once so the admin user is written to persistent state, sign in, then rotate away from plain env passwords when possible:

1. Set a new long `REPOS_ADMIN_PASSWORD` temporarily, restart, and sign in.
2. Remove the plain password from Railway variables after the persisted admin hash has been updated, or replace it with `REPOS_ADMIN_PASSWORD_HASH`.
3. Keep `REPOS_SESSION_SECRET` stable across restarts so signed sessions remain valid.

If you are locked out of JSON mode and have server-side access to the mounted state file, use the local helper instead of adding any public reset endpoint:

```bash
REPOS_CONFIRM_ADMIN_RESET=reset-strict-admin \
TESSARIO_DATA_FILE=/data/tessario-state.json \
REPOS_ADMIN_EMAIL=admin@example.com \
REPOS_ADMIN_PASSWORD="new-long-private-password" \
node scripts/reset-strict-admin.mjs
```

The helper only edits the configured JSON state file, creates a backup next to it, updates or creates the admin user, and clears existing sessions. It intentionally refuses to run for `DATABASE_URL` deployments.

JSON-file persistence remains the default and writes through a queued temp-file replace with a `.bak` backup. Postgres is supported through `DATABASE_URL`, but it should not become the default until production auth, migrations, backup/restore operations, and managed file storage are completed.

### Production Operations

For strict Railway production, keep these variables configured:

```bash
NODE_ENV=production
TESSARIO_AUTH_MODE=strict
TESSARIO_DISABLE_DEV_LOGIN=1
REPOS_SECURE_COOKIES=1
REPOS_SESSION_SECRET="use-at-least-32-random-characters"
REPOS_ADMIN_EMAIL=admin@example.com
REPOS_ADMIN_PASSWORD="set-a-strong-temporary-password"
# or REPOS_ADMIN_PASSWORD_HASH="scrypt:..."
REPOS_ADMIN_NAME="RepOS Admin"
REPOS_ADMIN_ROLE=admin
```

Use durable Railway volume paths for JSON state and uploads:

```bash
TESSARIO_DATA_FILE=/data/tessario-state.json
TESSARIO_UPLOAD_DIR=/data/uploads
```

Before destructive demo restores, sign in as an admin and use Admin Hub > Production operations > Download state backup. The backup export is admin-only and omits session secrets, cookies, password hashes, active sessions, SSO secrets, and plaintext passwords. Restore seed demo data requires typing `RESTORE`; it overwrites tickets, assignment pool, profile preferences, product links, customer accounts, and notifications, but does not delete uploaded files.

Admins and owners can create password-backed login users from Admin Hub > Login users. Login users control sign-in and role access; assignment-pool reps control ticket routing and reassignment. To create a rep test account, choose the `rep` role, set a temporary password, verify the user can sign in, then have the password saved or rotated immediately. Rep login users can use tickets, macros, and ticket context tools, but admin-only backup, restore, login-user, and Product Link Library management tools stay restricted.

For admin password rotation, set a new `REPOS_ADMIN_PASSWORD`, restart/redeploy, sign in once, then prefer removing the plaintext password or replacing it with `REPOS_ADMIN_PASSWORD_HASH`. Keep `REPOS_SESSION_SECRET` stable across restarts.

For Enterprise SSO, set `REPOS_SSO_ENABLED=true`, configure issuer/client/secret/redirect URI, register `https://your-repos-domain.com/api/auth/sso/callback` with the provider, and optionally set `REPOS_SSO_ALLOWED_DOMAINS`. Confirm `/api/auth/sso/config` reports enabled/configured before directing users to SSO.

The `TESSARIO_*` names remain legacy compatibility aliases for the existing JSON persistence and auth configuration.

Production health checks:

```bash
curl https://your-repos-app.example.com/api/health
curl https://your-repos-app.example.com/api/session
curl https://your-repos-app.example.com/api/auth/sso/config
```

## Current Status

RepOS is an active prototype for exploring customer support workflows and internal tooling.

It includes a practical local backend, demo data, MVP auth/session behavior, JSON persistence, optional Postgres support, and local upload handling. Production-grade auth, email sync, order lookup, inventory lookup, and durable cloud file storage are not complete yet.

## Related Projects

- RepStack: review collection and pay-period tracking app
- RepReport: review parser and export helper
- RepGuard: evidence and claim review workspace
