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

- `development` keeps local convenience by auto-authenticating the seeded admin user.
- `demo` requires an explicit demo sign-in and does not silently create an admin session.
- `strict` disables dev/demo login, accepts valid existing sessions, and can issue sessions through `/api/auth/login` for configured users.

When `NODE_ENV=production` and no auth mode is set, RepOS defaults to `strict`. The `/api/health` and `/api/session` responses include the active auth mode and whether automatic session, dev/demo login, password login, and production admin configuration are enabled.

Strict production login uses existing persisted auth users with `passwordHash` or an environment-provisioned initial admin:

```bash
TESSARIO_AUTH_MODE=strict
TESSARIO_DISABLE_DEV_LOGIN=1
TESSARIO_SESSION_DAYS=7
REPOS_SECURE_COOKIES=1
REPOS_ADMIN_EMAIL=admin@example.com
REPOS_ADMIN_NAME="RepOS Admin"
REPOS_ADMIN_ROLE=admin
REPOS_ADMIN_PASSWORD="use-a-long-private-password"
```

`REPOS_ADMIN_PASSWORD` is hashed with Node's built-in `scrypt` before it is persisted. For stricter secret handling, provision `REPOS_ADMIN_PASSWORD_HASH` instead and omit the plain password from the runtime environment. Do not use `development`, `demo`, or the default demo password for a real production workspace.

For Railway, set `NODE_ENV=production`, `TESSARIO_AUTH_MODE=strict`, `TESSARIO_DISABLE_DEV_LOGIN=1`, `REPOS_SECURE_COOKIES=1`, and the `REPOS_ADMIN_*` variables in Railway environment variables. Keep `TESSARIO_DATA_FILE` and `TESSARIO_UPLOAD_DIR` pointed at durable storage if the deployment should retain JSON state and uploads across restarts.

JSON-file persistence remains the default and writes through a queued temp-file replace with a `.bak` backup. Postgres is supported through `DATABASE_URL`, but it should not become the default until production auth, migrations, backup/restore operations, and managed file storage are completed.

## Current Status

RepOS is an active prototype for exploring customer support workflows and internal tooling.

It includes a practical local backend, demo data, MVP auth/session behavior, JSON persistence, optional Postgres support, and local upload handling. Production-grade auth, email sync, order lookup, inventory lookup, and durable cloud file storage are not complete yet.

## Related Projects

- RepStack: review collection and pay-period tracking app
- RepReport: review parser and export helper
- RepGuard: evidence and claim review workspace
