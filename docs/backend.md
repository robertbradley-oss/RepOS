# RepOS Backend MVP

This backend pass keeps RepOS simple to run while moving the app away from browser-only persistence and toward normalized server data.

## What It Provides

- Static hosting for the current RepOS frontend.
- JSON API endpoints under `/api`.
- Server-side persistence in `.data/tessario-state.json` by default.
- Optional Postgres persistence when `DATABASE_URL` is set.
- Bootstrap loading so the frontend can hydrate from backend state.
- Sync endpoints for tickets, users, profile settings, notifications, Knowledge Vault metadata, product links, customer accounts, and the last ticket number.
- Normalized ticket endpoints for ticket creation, updates, reads, messages, and notes.
- Normalized customer endpoints for customers, ticket history, account notes, receipts, and warranties.
- Protected upload/download endpoints for customer receipts and Knowledge Vault files.
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
- `GET /api/customers?search=avery&limit=50&offset=0`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `GET /api/customers/:id/tickets`
- `POST /api/customers/:id/notes`
- `POST /api/customers/:id/receipts`
- `POST /api/customers/:id/receipts/upload`
- `POST /api/customers/:id/warranties`
- `POST /api/knowledge/files/upload`
- `GET /api/files/:id`
- `POST /api/reset`

## File Uploads

Local uploads are written to `.uploads/` by default and are served only through authenticated API routes. Set `TESSARIO_UPLOAD_DIR` to use a different local folder and `TESSARIO_MAX_UPLOAD_BYTES` to change the default 20 MB upload limit.

Supported file types:

- PDF
- PNG/JPG
- TXT/CSV
- DOCX/XLSX

Customer receipt uploads create both a protected file record and customer receipt metadata. Knowledge Vault uploads are admin-guarded and add a document record to `knowledgeDocs`.

## Auth Mode

By default, RepOS runs in development auth mode. The server auto-creates an admin user for `CS14 Robert` and sets an HTTP-only session cookie when protected routes are used.

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
- `POST /api/knowledge/files/upload`
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
- `customers` for normalized customer profiles.
- `customer_notes` for customer account notes.
- `customer_receipts` for receipt metadata.
- `customer_warranties` for warranty metadata.
- `uploaded_files` for protected local upload metadata.

## Next Backend Upgrades

- Replace dev login with production passwordless, OAuth, or password-based authentication.
- Move frontend customer-history actions to the normalized customer endpoints.
- Add normalized tables for assignments, macros, Knowledge Vault documents, and activity history.
- Move local uploads to durable object storage for deployed environments.
- Add PDF/DOCX text extraction and searchable Knowledge Vault content.
- Add email ingestion and outbound email integration.
