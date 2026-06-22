# RepOS

## Project Purpose

RepOS, short for Rep Operating System, is a front-end prototype for a modern internal ticketing workspace. The current demo workspace uses iSpring Water Systems, with realistic water-system support tickets, customer history, rep workflows, macros, and follow-up context.

The product concept is workspace-agnostic: RepOS provides the ticketing, dashboard, customer-history, assignment, and macro experience, while the iSpring demo workspace supplies the sample departments, products, policies, tickets, and support language used to demonstrate the workflow.

This is currently an MVP prototype with a lightweight local backend. It includes server-side JSON persistence for demo data, optional Postgres support, MVP auth, and protected local file uploads. It does not yet include production login, email sync, order lookup, inventory lookup, cloud file storage, or document text extraction.

## How To Run Locally

From this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://127.0.0.1:4173
```

The app has no build step. It is plain HTML, CSS, JavaScript, and a lightweight Node server. `pg` is installed only for optional Postgres persistence; the default local mode uses JSON-file persistence.

## Smoke Checks

Run the backend smoke after backend, store, normalized ticket endpoint, upload/download, auth, customer-route, or persistence changes:

```powershell
npm.cmd run smoke
```

Run the browserless frontend ticket API smoke after `app.js` ticket mutation helper changes, normalized ticket endpoint changes, fallback behavior changes, or ticket persistence logic changes:

```powershell
npm.cmd run smoke:frontend-ticket-api
```

The frontend ticket API smoke does not use Playwright or browser automation.

## Backend MVP

`server.mjs` now serves the frontend and exposes API endpoints under `/api`. It uses local JSON-file persistence by default and switches to Postgres when `DATABASE_URL` is set.

- `GET /api/health`
- `GET /api/session`
- `POST /api/auth/dev-login`
- `POST /api/auth/logout`
- `GET /api/auth/users`
- `GET /api/bootstrap`
- `GET /api/analytics/summary`
- `GET /api/queue-views`
- `GET /api/queue-views/:id/tickets`
- `GET /api/state/:resource`
- `PUT /api/state/:resource`
- `GET /api/tickets`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `POST /api/tickets/:id/messages`
- `POST /api/tickets/:id/notes`
- `GET /api/customers`
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

The backend persists synced demo state to `.data/tessario-state.json` and local uploads to `.uploads/`, both intentionally ignored by Git. Development mode auto-creates an admin session for CS14 Robert; set `TESSARIO_AUTH_MODE=strict` when you want API routes to require an explicit session. See `.env.example` for supported runtime settings and `docs/backend.md` for the backend plan and next upgrades.

## Demo State And Workspace Context

RepOS is the product. iSpring Water Systems is the active demo workspace/customer context used to show the ticketing workflow, sample products, support language, macros, and customer history.

Local demo sessions are persisted by design. When the Node backend is running, dashboard counts and ticket data reflect the current `.data/tessario-state.json` state. In static or backend-unavailable mode, they reflect the browser's localStorage fallback. This means counts can differ from the original seed data after tickets, reps, customer accounts, Knowledge Vault metadata, product links, or profile settings are changed during demos.

Admin users can use the existing Workspace recovery controls in Admin Hub or Profile > Workspace to restore the seeded iSpring demo data. The restore action asks for confirmation and overwrites local demo state for tickets, assignment users, profile preferences, Knowledge Vault metadata, Product Link Library, customer accounts, and notifications. Uploaded local files are not deleted by that UI restore.

Common runtime settings:

- `HOST`: Defaults to `127.0.0.1`. Use `0.0.0.0` only when a Node hosting platform requires it.
- `PORT`: Defaults to `4173`.
- `TESSARIO_DATA_FILE`: Defaults to `.data/tessario-state.json`.
- `TESSARIO_UPLOAD_DIR`: Defaults to `.uploads`.
- `TESSARIO_AUTH_MODE`: Defaults to `development`; use `strict` for explicit-session auth checks.
- `TESSARIO_DISABLE_DEV_LOGIN`: Defaults to `0`; set `1` to disable `POST /api/auth/dev-login`.
- `TESSARIO_SESSION_DAYS`: Defaults to `7`.
- `DATABASE_URL`: Optional. When set, RepOS uses Postgres and runs `db/schema.sql` on startup unless `TESSARIO_AUTO_MIGRATE=0`.

## How To Deploy A Demo

For a static Vercel demo, deploy the folder root and serve the frontend files only. Static hosting uses browser/local fallback state and does not run the Node API, JSON persistence, auth, or protected uploads.

Current production alias:

```text
https://rep-os.vercel.app
```

Vercel also creates one-time deployment URLs, such as `https://ispring-support-awyx1p8uy-robbybradley-oss-projects.vercel.app`. Those are snapshots. If an older deployment URL still shows zero metrics, use the production alias above or redeploy.

If PowerShell blocks the Vercel script or Node has certificate trouble, this worked locally:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
vercel.cmd --prod
```

Recommended Vercel settings:

- Framework preset: Other
- Build command: leave empty
- Output directory: `.`
- Install command: leave empty

The important deployed files are:

- `index.html`
- `styles.css`
- `app.js`
- `assets/repos-mark.png`
- `assets/repos-logo.png`
- `assets/ispring-logo.png`

For a backend-backed demo, run `server.mjs` on a Node host with durable storage settings:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='4173'
npm.cmd run start
```

Use mounted/persistent paths for `TESSARIO_DATA_FILE` and `TESSARIO_UPLOAD_DIR`, or set `DATABASE_URL` for Postgres state. Uploaded file bytes still use `TESSARIO_UPLOAD_DIR`, so use durable object storage or a persistent volume before treating uploads as production data.

### Railway Auth Settings

Railway deployments that leave `TESSARIO_AUTH_MODE` unset run in development auth mode. In that mode RepOS auto-creates or reuses the seeded `CS14 Robert` admin session, which is convenient for an open demo but is not production-secure.

Recommended choices:

- Demo/open mode: leave `TESSARIO_AUTH_MODE=development` for a disposable demo where automatic admin access is acceptable.
- Controlled demo mode: set `TESSARIO_AUTH_MODE=strict` and leave `TESSARIO_DISABLE_DEV_LOGIN=0` only while you intentionally use `POST /api/auth/dev-login` to create a demo session. This still is not production-secure.
- Locked-down demo mode: set both values below. Protected API routes require a valid `tessario_session`, and the dev-login endpoint is disabled. This reduces accidental open access, but it is not a production authentication system.

```text
TESSARIO_AUTH_MODE=strict
TESSARIO_DISABLE_DEV_LOGIN=1
TESSARIO_SESSION_DAYS=7
```

Strict mode with dev login disabled can block new access because RepOS does not yet include password, OAuth, passwordless, or invite-based production login. Existing valid session cookies may continue to work until expiry, but they are not a reliable access plan.

After changing Railway auth settings and redeploying, verify the live backend:

```powershell
curl.exe --ssl-no-revoke https://repos-production-e956.up.railway.app/api/health
curl.exe --ssl-no-revoke https://repos-production-e956.up.railway.app/api/session
curl.exe --ssl-no-revoke https://repos-production-e956.up.railway.app/api/tickets
curl.exe --ssl-no-revoke -X POST https://repos-production-e956.up.railway.app/api/auth/dev-login
```

With strict mode plus disabled dev login, expected results are:

- health: `200` with `authMode:"strict"`
- session: `200` with `authenticated:false`
- tickets: `401 authentication_required`
- dev-login POST: `403 dev_login_disabled`

JSON-file persistence on Railway is acceptable for a demo when mounted storage is intentional. Use `DATABASE_URL` with `PGSSLMODE=require` before treating deployed state as production data.

## Current App Structure

- `index.html`: Static app shell. Contains the sidebar, top bar, metric strip, two-screen ticket workspace, queue controls, admin assignment screen, customer-history modal, and create-ticket modal.
- `styles.css`: Desktop-first CRM styling. Defines the dark navy sidebar, compact metric cards, queue/detail screen layouts, card/table queue views, conversation thread, reply dock, and right context panel.
- `app.js`: Main front-end application logic. Contains the `workspaceConfig` demo configuration, mock ticket data, assignment users, fair-routing logic, main support views, screen state, view/filter/sort state, table queue rendering, conversation rendering, smart diagnosis, macros, attachments, guardrails, customer history, admin controls, and create-ticket behavior.
- `assets/repos-mark.png`: Active RepOS icon mark used for the in-app product lockup and browser favicon.
- `assets/repos-logo.png`: Full RepOS logo asset retained for product-brand treatments when needed outside the current workspace header.
- `assets/ispring-logo.png`: Active iSpring workspace logo used in the top header.
- `server.mjs`: Node server for static hosting and MVP JSON API persistence.
- `docs/backend.md`: Backend MVP notes and next upgrade path.
- `.vercel/`: Vercel project metadata, if linked locally.

## Main Features

- Ticket queue for scanning open, assigned, and closed support requests.
- Ticket detail workspace with customer context, message history, notes, attachments, status updates, and reply drafting.
- Dashboard views for support activity, workload, SLA risk, product trends, and tickets needing attention.
- Knowledge Vault prototype for tracking approved workspace source files.
- Admin tools for assignment pool management, rep settings, workspace configuration, and mock routing controls.
- iSpring model data including sample products, support macros, customer tickets, warranty/receipt context, and guardrails.
- Static frontend with localStorage fallback and backend JSON persistence for demo data.
- Protected local upload/download endpoints for customer receipts and Knowledge Vault files.

## Known Issues

- Backend persistence uses a local JSON file unless `DATABASE_URL` is configured for Postgres.
- Auth and role checks exist as an MVP, but production password/OAuth login is not built yet.
- Email ingestion and cloud file storage are not production-ready yet.
- `localStorage` remains as a browser fallback. The app validates the saved mock-ticket schema and reseeds default data when stale data is detected.
- Attachment previews still use mock inline/modal rendering in parts of the UI, though backend upload/download endpoints now exist.
- Copy actions use `navigator.clipboard` and may silently do nothing if the browser blocks clipboard access.
- The app is optimized for desktop. Smaller screens are not the current priority.
- Vercel deployment should serve static files unless a server/runtime deployment path is configured.

## Next Planned Upgrades

- Split `app.js` into smaller modules for mock data, rendering, macros, and utilities.
- Add more granular demo-state recovery and export options for support demos.
- Add a richer ticket creation/editing flow with product/order/warranty fields.
- Add saved custom views and visible column preferences.
- Add admin audit history for assignment pool changes.
- Replace JSON-file persistence with Postgres and normalized ticket/customer/message tables.
- Add real auth, role checks, and organization/workspace membership.
- Move uploaded files to durable cloud/object storage and add document text extraction for Knowledge Vault sources.
- Add a real macro drawer with categories, favorites, previews, and personal/team/admin macro types.
- Add better attachment preview modals for photos and PDFs.
- Expand the Dashboard with richer manager views for workload forecasting, SLA breach causes, oldest tickets, and escalation coaching.
- Add mock order/warranty lookup panels before wiring real integrations.
- Add tests or scripted browser checks for core UI flows.


