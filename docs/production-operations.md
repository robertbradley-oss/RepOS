# RepOS Production Operations

This guide contains the operational detail intentionally kept out of the project overview.

## Runtime Safety

Auth mode is controlled by `TESSARIO_AUTH_MODE`. The `TESSARIO_*` environment names are legacy compatibility aliases retained for existing deployments while the product-facing app name is RepOS.

- `development` keeps local convenience by auto-authenticating the seeded admin user.
- `demo` requires an explicit demo sign-in and does not silently create an admin session.
- `strict` disables dev/demo login, accepts valid existing sessions, and can issue sessions through `/api/auth/login` for configured users.

When `NODE_ENV=production` and no auth mode is set, RepOS defaults to `strict`. Production strict mode blocks startup when a strong session secret is missing, when dev/demo login would be exposed, or when neither an environment admin nor an active persisted password user is available.

The `/api/health` and `/api/session` responses include safe runtime flags without exposing admin emails, password hashes, session secrets, or database URLs.

## Strict Production Login

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

`REPOS_ADMIN_PASSWORD` is hashed with Node's built-in `scrypt` before it is persisted. For stricter secret handling, provision `REPOS_ADMIN_PASSWORD_HASH` instead and omit the plain password. Keep `REPOS_SESSION_SECRET` stable across restarts. Do not use `development`, `demo`, or the default demo password for a real production workspace.

## Enterprise SSO

Enterprise SSO is optional and disabled unless `REPOS_SSO_ENABLED=true`. It uses OpenID Connect / OAuth 2.0 Authorization Code flow and signs users into the existing RepOS session system.

```bash
REPOS_SSO_ENABLED=true
REPOS_SSO_ISSUER=https://your-identity-provider.example.com
REPOS_SSO_CLIENT_ID=your-client-id
REPOS_SSO_CLIENT_SECRET=your-client-secret
REPOS_SSO_REDIRECT_URI=https://your-repos-domain.com/api/auth/sso/callback
REPOS_SSO_SCOPES="openid email profile"
REPOS_SSO_ALLOWED_DOMAINS=company.com,ispringfilter.com
```

Register the redirect URI exactly as configured. RepOS never exposes `REPOS_SSO_CLIENT_SECRET` to the frontend and does not store provider access tokens in browser storage.

## Railway and Durable Storage

Mount a Railway volume and point JSON state and uploads at it:

```bash
TESSARIO_DATA_FILE=/data/tessario-state.json
TESSARIO_UPLOAD_DIR=/data/uploads
```

If these paths are left at `.data` and `.uploads`, Railway can restart on ephemeral filesystem state. RepOS reports the storage classification through startup logs and `/api/health`.

JSON-file persistence writes through a queued temporary-file replace with a `.bak` backup. Postgres is supported through `DATABASE_URL`, but should not become the default until production auth, migrations, backup/restore operations, and managed file storage are complete.

## First Admin Setup and Rotation

For the first production boot, set `REPOS_ADMIN_EMAIL`, `REPOS_ADMIN_NAME`, `REPOS_ADMIN_ROLE`, and either `REPOS_ADMIN_PASSWORD` or `REPOS_ADMIN_PASSWORD_HASH`. Start RepOS once, sign in, then rotate away from plain environment passwords when possible.

If locked out of JSON mode with server-side access to the mounted state file, use the local helper instead of adding a public reset endpoint:

```bash
REPOS_CONFIRM_ADMIN_RESET=reset-strict-admin \
TESSARIO_DATA_FILE=/data/tessario-state.json \
REPOS_ADMIN_EMAIL=admin@example.com \
REPOS_ADMIN_PASSWORD="new-long-private-password" \
node scripts/reset-strict-admin.mjs
```

The helper creates a backup, updates or creates the admin user, and clears existing sessions. It refuses to run for `DATABASE_URL` deployments.

## Backup and Restore

Before destructive demo restores, use **Admin Hub > Production operations > Download state backup**. The admin-only export omits secrets, password hashes, active sessions, and plaintext passwords. Restoring seed demo data requires typing `RESTORE`; it overwrites application data but does not delete uploaded files.

Admins and owners can create password-backed login users from **Admin Hub > Login users**. Login users control sign-in and role access; assignment-pool reps control ticket routing and reassignment.

## Health Checks

```bash
curl https://your-repos-app.example.com/api/health
curl https://your-repos-app.example.com/api/session
curl https://your-repos-app.example.com/api/auth/sso/config
```

For strict production, confirm `auth.mode` is `strict`, `auth.devLogin` is `false`, `auth.strictLoginConfigured` is `true`, `auth.sessionSecretStrong` is `true`, `readiness.ready` is `true`, and durable storage is reported when using a Railway volume.
