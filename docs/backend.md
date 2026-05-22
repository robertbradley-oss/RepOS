# Tessario Backend MVP

This backend pass keeps Tessario simple to run while moving the app away from browser-only persistence and toward normalized server data.

## What It Provides

- Static hosting for the current Tessario frontend.
- JSON API endpoints under `/api`.
- Server-side persistence in `.data/tessario-state.json` by default.
- Optional Postgres persistence when `DATABASE_URL` is set.
- Bootstrap loading so the frontend can hydrate from backend state.
- Sync endpoints for tickets, users, profile settings, notifications, Knowledge Vault metadata, product links, customer accounts, and the last ticket number.
- Normalized ticket endpoints for ticket creation, updates, reads, messages, and notes.
- MVP auth users, sessions, HTTP-only session cookies, and role checks.

## Run Locally

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:4173
```

## API Endpoints

- `GET /api/health`
- `GET /api/session`
- `POST /api/auth/dev-login`
- `POST /api/auth/logout`
- `GET /api/auth/users`
- `GET /api/bootstrap`
- `GET /api/state/:resource`
- `PUT /api/state/:resource`
- `GET /api/tickets?status=Open&assignee=CS14%20Robert&search=RCC7&limit=50&offset=0`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `POST /api/tickets/:id/messages`
- `POST /api/tickets/:id/notes`
- `POST /api/reset`

## Auth Mode

By default, Tessario runs in development auth mode. The server auto-creates an admin user for `CS14 Robert` and sets an HTTP-only session cookie when protected routes are used.

Default admin:

- Email: `robbybradley@gmail.com`
- Display name: `CS14 Robert`
- Role: `admin`

Use strict mode to require an explicit session:

```powershell
$env:TESSARIO_AUTH_MODE='strict'
npm.cmd run dev
```

In strict mode, protected routes return `401` until a session exists. For local development, `POST /api/auth/dev-login` creates a session for the seeded admin unless `TESSARIO_DISABLE_DEV_LOGIN=1` is set.

Admin-guarded routes currently include:

- `GET /api/auth/users`
- `POST /api/reset`
- `PUT /api/state/users`
- `PUT /api/state/profile`
- `PUT /api/state/knowledgeDocs`
- `PUT /api/state/productLinks`
- `PUT /api/state/customerAccounts`

Supported resources:

- `tickets`
- `users`
- `profile`
- `notifications`
- `knowledgeDocs`
- `productLinks`
- `customerAccounts`
- `lastTicketNumber`

## Postgres Mode

Set `DATABASE_URL` before starting the server:

```powershell
$env:DATABASE_URL='postgres://user:password@localhost:5432/tessario'
npm.cmd run dev
```

By default, the server runs the schema in `db/schema.sql` on startup. Set `TESSARIO_AUTO_MIGRATE=0` to disable automatic schema creation.

Postgres mode creates:

- `app_state` for compatibility with the current frontend sync contract.
- `tickets` for normalized ticket records.
- `ticket_messages` for normalized ticket message/note records.
- `auth_users` for backend users and roles.
- `auth_sessions` for HTTP-only session cookies.

## Next Backend Upgrades

- Replace dev login with production passwordless, OAuth, or password-based authentication.
- Add normalized tables for customers, users, assignments, macros, Knowledge Vault documents, and activity history.
- Add real file upload storage for receipts, screenshots, and Knowledge Vault documents.
- Add PDF/DOCX text extraction and searchable Knowledge Vault content.
- Add email ingestion and outbound email integration.
