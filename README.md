# Tessario (iSpring Model)

## Project Purpose

Tessario is a front-end prototype for a modern internal ticketing workspace. This version is the iSpring model, a demo workspace built around realistic water-system support tickets, customer history, rep workflows, macros, and follow-up context.

The product concept is workspace-agnostic: Tessario provides the ticketing, dashboard, customer-history, assignment, macro, and assistant experience, while the iSpring model supplies the sample departments, products, policies, tickets, and support language used to demonstrate the workflow.

This is currently a static mock-data prototype. It does not include backend auth, email sync, databases, order lookup, inventory lookup, or real ticket persistence beyond browser `localStorage`.

## How To Run Locally

From this folder:

```powershell
node server.mjs
```

Then open:

```text
http://127.0.0.1:4173
```

The app has no package install step and no build step. It is plain HTML, CSS, and JavaScript.

## How To Deploy To Vercel

This project is a static site. Deploy the folder root to Vercel.

Current production alias:

```text
https://ispring-support-hub.vercel.app
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
- `assets/tessario-mark.svg`
- `assets/tessario-logo.svg`
- `assets/ispring-logo.png`

`server.mjs` is only for local preview and is not needed for Vercel hosting.

## Current App Structure

- `index.html`: Static app shell. Contains the sidebar, top bar, metric strip, two-screen ticket workspace, queue controls, admin assignment screen, customer-history modal, and create-ticket modal.
- `styles.css`: Desktop-first CRM styling. Defines the dark navy sidebar, compact metric cards, queue/detail screen layouts, card/table queue views, conversation thread, reply dock, and right context panel.
- `app.js`: Main front-end application logic. Contains the `workspaceConfig` demo configuration, mock ticket data, assignment users, fair-routing logic, main support views, screen state, view/filter/sort state, table queue rendering, conversation rendering, smart diagnosis, macros, attachments, guardrails, customer history, admin controls, and create-ticket behavior.
- `assets/tessario-mark.svg`: Tessario icon-only mark used for the left sidebar brand mark and browser favicon.
- `assets/tessario-logo.svg`: Full Tessario logo asset retained for product-brand treatments when needed outside the current workspace header.
- `assets/ispring-logo.png`: Active iSpring workspace logo used in the top header.
- `server.mjs`: Minimal Node static server for local preview.
- `.vercel/`: Vercel project metadata, if linked locally.

## Main Features

- Ticket queue for scanning open, assigned, and closed support requests.
- Ticket detail workspace with customer context, message history, notes, attachments, status updates, and reply drafting.
- Dashboard views for support activity, workload, SLA risk, product trends, and tickets needing attention.
- Tessario Assist mock copilot for ticket summaries, draft replies, next-step guidance, and support-safe wording.
- Knowledge Vault prototype for tracking approved source files that future assistant workflows can use.
- Admin tools for assignment pool management, rep settings, workspace configuration, and mock routing controls.
- iSpring model data including sample products, support macros, customer tickets, warranty/receipt context, and guardrails.
- Static local prototype with browser `localStorage` persistence for demo data.

## Known Issues

- No real backend, database, auth, email ingestion, or role permissions yet.
- `localStorage` is used for persistence. The app now validates the saved mock-ticket schema and reseeds default data when stale data is detected.
- Attachment previews use mock inline/modal rendering until real backend file storage and downloads exist.
- Copy actions use `navigator.clipboard` and may silently do nothing if the browser blocks clipboard access.
- The app is optimized for desktop. Smaller screens are not the current priority.
- Next Best Step guidance is rule/mock-data based. AI Assignment is currently mock fair-routing logic, not a real AI service.
- Vercel deployment should serve static files, but `server.mjs` is local-only.

## Next Planned Upgrades

- Split `app.js` into smaller modules for mock data, rendering, macros, and utilities.
- Add a manual reset/demo data button for support demos.
- Add a richer ticket creation/editing flow with product/order/warranty fields.
- Add saved custom views and visible column preferences.
- Add richer AI routing rules for specialized queues, PTO/coverage, language skills, product specialization, and manager overrides.
- Add admin audit history for assignment pool changes.
- Add a real macro drawer with categories, favorites, previews, and personal/team/admin macro types.
- Add better attachment preview modals for photos and PDFs.
- Expand the Dashboard with richer manager views for workload forecasting, SLA breach causes, oldest tickets, and escalation coaching.
- Add mock order/warranty lookup panels before wiring real integrations.
- Add tests or scripted browser checks for core UI flows.


