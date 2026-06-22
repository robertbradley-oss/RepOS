# RepOS Backend MVP

This backend pass keeps RepOS simple to run while moving the app away from browser-only persistence and toward normalized server data.

## What It Provides

- Static hosting for the current RepOS frontend.
- JSON API endpoints under `/api`.
- Server-side persistence in `.data/tessario-state.json` by default.
- Optional Postgres persistence when `DATABASE_URL` is set.
- Bootstrap loading so the frontend can hydrate from backend state.
- Sync endpoints for tickets, users, profile settings, notifications, Knowledge Vault metadata, product links, customer accounts, and the last ticket number.
- Normalized ticket endpoints for ticket creation, updates, reads, messages, notes, and attachment metadata.
- Normalized customer endpoints for customers, ticket history, account notes, receipts, and warranties.
- Protected upload/download endpoints for customer receipts and Knowledge Vault files.
- Analytics summary endpoint for simple ticket counts and recent ticket activity.
- Queue view endpoints for reusable backend ticket filters.
- MVP auth users, sessions, HTTP-only session cookies, and role checks.

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:4173
```

See `.env.example` for supported runtime settings. The server does not auto-load `.env` files; set values in your shell or deployment environment.

Use `HOST=0.0.0.0` only for Node hosting platforms that require binding outside localhost:

```powershell
$env:HOST='0.0.0.0'
npm.cmd run start
```

## Smoke Checks

Run the backend smoke after changes to `server.mjs`, store implementations, normalized ticket endpoints, auth/session behavior, upload/download routes, customer routes, or persistence handling:

```powershell
npm.cmd run smoke
```

That command starts temporary local RepOS servers and checks health, auth, state resources, normalized ticket create/update/message/note/attachment flows, customer and file routes, strict auth, and JSON persistence reload behavior.

Run the frontend ticket API smoke after changes to `app.js` ticket mutation helpers, normalized ticket endpoints, fallback behavior, or ticket persistence logic:

```powershell
npm.cmd run smoke:frontend-ticket-api
```

That command is browserless and does not use Playwright. It exercises the frontend helper paths for status, close/reopen, reassignment, internal notes, customer-facing replies, attachment metadata, backend response replacement, fallback-to-full-sync behavior, and protection against replacing the full local ticket array with a single-ticket response.

## API Endpoints

- `GET /api/health`
- `GET /api/session`
- `POST /api/auth/dev-login`
- `POST /api/auth/logout`
- `GET /api/auth/users`
- `GET /api/bootstrap`
- `GET /api/analytics/summary?windowHours=24&limit=20`
- `GET /api/queue-views`
- `GET /api/queue-views/:id/tickets?customerEmail=avery%40example.com&limit=50`
- `GET /api/state/:resource`
- `PUT /api/state/:resource`
- `GET /api/tickets?status=Open&assignee=CS14%20Robert&search=RCC7&limit=50&offset=0`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `POST /api/tickets/:id/messages`
- `POST /api/tickets/:id/notes`
- `POST /api/tickets/:id/attachments`
- `GET /api/customers?search=avery&limit=50&offset=0`
- `POST /api/customers`
- `GET /api/customers/by-email/:email`
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

## Ticket Merge Contract

Ticket merging is available through the normalized backend ticket API. The endpoint marks a primary ticket as merged, preserves secondary conversation and attachment context on the primary, and hides secondary tickets from normal backend list, queue, and analytics surfaces by default.

Endpoint:

```text
POST /api/tickets/:id/merge
```

`id` is the primary ticket ID. The request body should be a JSON object:

```json
{
  "secondaryTicketIds": ["ISP-28480", "ISP-28482"],
  "note": "Duplicate customer thread",
  "closeSecondary": true
}
```

- `secondaryTicketIds` is required and must contain at least one unique ticket ID.
- `note` is optional and should be stored as an internal/audit note when present.
- `closeSecondary` is optional. When true, secondary tickets are marked `Closed` after receiving `mergedInto` metadata; when omitted, secondary status is preserved and the `mergedInto` breadcrumb is the durable retirement signal.

Current permission model: require an authenticated `admin` or `owner` user. Keep any future ticket-level access or role expansion simple and explicit.

The implementation uses a dedicated store merge operation for JSON-file and Postgres parity. Do not route merge metadata through generic ticket patch handling, because merge needs multi-ticket validation, atomic/no-partial-write behavior, and coordinated primary/secondary timeline entries.

Response shape should return the updated primary ticket, the secondary merge summaries, and the audit entries created by the operation:

```json
{
  "ticket": {},
  "merged": [
    {
      "id": "ISP-28480",
      "mergedInto": "ISP-28494",
      "mergedAt": "2026-06-22T18:42:00.000Z",
      "mergedBy": "CS14 Robert"
    },
    {
      "id": "ISP-28482",
      "mergedInto": "ISP-28494",
      "mergedAt": "2026-06-22T18:42:00.000Z",
      "mergedBy": "CS14 Robert"
    }
  ],
  "audit": [
    {
      "ticketId": "ISP-28494",
      "type": "merge",
      "body": "CS14 Robert merged ISP-28480 into this ticket."
    }
  ]
}
```

Validation should happen before any tickets are mutated:

- Return `400 invalid_merge_payload` when the body is not an object, `secondaryTicketIds` is missing or empty, IDs are malformed, or duplicate secondary IDs are supplied.
- Return `400 cannot_merge_ticket_into_itself` when the primary ID appears in `secondaryTicketIds`.
- Return `404 ticket_not_found` when the primary ticket does not exist.
- Return `404 secondary_ticket_not_found` with the missing IDs when any secondary ticket does not exist.
- Return `409 ticket_already_merged` when the primary or a secondary already has `mergedInto`, unless a later product decision explicitly supports chained merges.
- Return `409 unsafe_ticket_status` when closed, already merged, or otherwise locked tickets would make the merge ambiguous.
- Return `409 merge_cycle_detected` if metadata would create a cycle.
- Return `409 customer_mismatch` when target tickets belong to different customer emails or customer IDs. If support later needs cross-customer merges, make that an explicit override rather than the default.

Stable merge metadata:

- Primary ticket: `merged: true`, `mergedFrom: [...]`, and normal `updatedAt` refresh.
- Secondary tickets: `mergedInto: primaryTicketId`, `mergedAt`, `mergedBy`, and normal `updatedAt` refresh.
- Primary timeline: one merge event summarizing the secondary tickets and actor.
- Secondary timeline: one merged-into event pointing back to the primary ticket.

Conversation and attachment preservation rules:

- Secondary conversation entries should be represented on the primary ticket without losing the original secondary tickets.
- Copied or referenced conversation entries must include source-ticket metadata, such as `mergedFrom` or `sourceTicketId`, so thread origin remains traceable.
- Secondary attachments should be preserved on or reachable from the primary ticket.
- Attachment duplication should be avoided with stable identity, preferring attachment/file IDs before filename or URL fallbacks.
- Original secondary tickets remain intact and receive breadcrumb metadata rather than being deleted.

Backend queue and API behavior after merge:

- `GET /api/tickets` should exclude tickets with `mergedInto` from normal visible results by default.
- `GET /api/queue-views/:id/tickets` should hide `mergedInto` tickets by default, with totals and pagination based on the filtered visible set.
- `GET /api/analytics/summary` should exclude `mergedInto` tickets from open counts and normal workload totals. Keep the total-count rule explicit in implementation tests so archived merge records are not accidentally double-counted.
- A future `includeMerged=true` query flag may expose merged-into tickets for admin review, direct links, or audit views.
- Existing tickets without merge metadata should continue to behave normally.

`/api/state/tickets` remains a legacy/demo full-state sync path. Do not remove it as part of merge work, but future durable ticket mutations should prefer normalized ticket endpoints. If `/api/state/tickets` remains writable, document that it can bypass normalized merge validation and keep smoke coverage around that compatibility boundary.

Smoke coverage should continue to include:

- Successful backend merge endpoint response and persisted metadata.
- Validation for missing, empty, duplicate, self, nonexistent, already-merged, locked-status, cycle, customer-mismatch, overlong note, unauthenticated, and insufficient-role cases.
- Validation failures leaving all target tickets unchanged.
- Queue views and `GET /api/tickets` hiding `mergedInto` tickets by default, with stable totals, pagination, and search over carried secondary context.
- Analytics excluding merged-into tickets from open, assigned, pending, closed, SLA, recent activity, and workload counts according to the documented total-count rule.
- Primary conversations and attachments preserving source-ticket metadata, original timestamps, protected file metadata, and download URLs without duplicate attachments.
- Primary and secondary ticket fields, merge metadata, and breadcrumbs surviving JSON-file reload and Postgres `data` round trips.
- `/api/state/tickets` compatibility remaining intact across `GET /api/state/tickets`, `/api/bootstrap`, normalized ticket reads, queue views, and analytics while normalized mutation behavior stays authoritative.

## File Uploads

Local uploads are written to `.uploads/` by default and are served only through authenticated API routes. Set `TESSARIO_UPLOAD_DIR` to use a different local folder and `TESSARIO_MAX_UPLOAD_BYTES` to change the default 20 MB upload limit.

Supported file types:

- PDF
- PNG/JPG
- TXT/CSV
- DOCX/XLSX

Customer receipt uploads create both a protected file record and customer receipt metadata. Knowledge Vault uploads are admin-guarded and add a document record to `knowledgeDocs`.

## Local Demo State

RepOS uses iSpring Water Systems as the demo workspace context. The default Node backend persists that local demo state to `.data/tessario-state.json`, so dashboard counts and queue totals reflect the current saved state rather than a fresh seed snapshot after local sessions have changed tickets, reps, customer accounts, Knowledge Vault metadata, product links, or profile preferences.

The existing Admin Hub and Profile > Workspace recovery controls restore seeded iSpring demo data only after confirmation. That restore overwrites synced local demo state for app data resources, but it does not delete files from `.uploads/`.

Ticket mutations through the normalized ticket API validate supported fields and add timeline entries for status changes, close/reopen actions, assignee changes, internal notes, customer-facing replies, and attachment metadata. The default JSON-file store writes through a temporary file and keeps a `.bak` copy of the prior saved state before replacing `.data/tessario-state.json`.

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
- `queueViews`
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
- Add normalized tables for assignments, macros, Knowledge Vault documents, and richer reporting over activity history.
- Move local uploads to durable object storage for deployed environments.
- Add PDF/DOCX text extraction and searchable Knowledge Vault content.
- Add email ingestion and outbound email integration.
