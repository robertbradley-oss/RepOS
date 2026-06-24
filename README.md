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

## Current Status

RepOS is an active prototype for exploring customer support workflows and internal tooling.

It includes a practical local backend, demo data, MVP auth/session behavior, JSON persistence, optional Postgres support, and local upload handling. Production-grade auth, email sync, order lookup, inventory lookup, and durable cloud file storage are not complete yet.

## Related Projects

- RepStack: review collection and pay-period tracking app
- RepReport: review parser and export helper
- RepGuard: evidence and claim review workspace
