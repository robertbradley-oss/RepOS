# Project Context

## Product Vision

RepOS, short for Rep Operating System, is intended to become a modern internal support workspace that lets reps search faster, troubleshoot smarter, reply cleaner, and manage customer tickets with fewer clicks. The current demo workspace uses iSpring Water Systems as the example customer.

Important product boundary: RepOS is the general SaaS support/ticketing platform. iSpring Water Systems is the active demo workspace/customer, not the product itself. iSpring-specific demo content should live under `workspaceConfig` so future companies can bring their own departments, reps, products, macros, warranty/return/review rules, categories, source channels, custom fields, and guardrails without changing the RepOS core workflow. RepOS Knowledge Vault source files are uploaded per workspace and currently stored as local metadata only.

Do not treat iSpring labels, model families, product policies, review links, RepOS Knowledge Vault sources, macros, source channels, or workspace-specific queue filters as RepOS product identity. The MVP should keep iSpring as the default demo workspace while core RepOS surfaces remain reusable for another company.

The app should improve daily support work for:

- Support reps handling customer tickets, phone follow-ups, troubleshooting, warranty requests, returns, replacement parts, and product questions.
- Senior support reps and technical leads handling escalations, difficult troubleshooting, warranty edge cases, and rep coaching.
- Managers tracking workload, response time, overdue tickets, trends, escalations, and quality/coaching notes.
- Admins managing users, roles, macros, custom fields, statuses, workflows, and integrations.

The first build is not meant to be a full CRM. It is a focused Ticket Workspace MVP that demonstrates the day-to-day support experience.

## Desired UI Direction

The UI should feel like a premium internal SaaS support tool, not a mobile-first landing page.

Important visual direction:

- Desktop-first CRM layout.
- Dark navy left sidebar using official RepOS Navy `#061432`.
- Current RepOS icon-only mark, sourced from `assets/tessario-mark.svg`, in the left sidebar and favicon only. The top header represents the active workspace/customer with the iSpring logo from `assets/ispring-logo.png` and the active workspace label.
- Active customer/workspace shown separately as "Workspace: iSpring Water Systems."
- Light, quiet main workspace using Soft Background `#F7FAFC`, white cards, and `#DDEAF5` borders.
- Compact metric strip.
- Dense but readable ticket queue with a compact OST-inspired structure that still looks like RepOS.
- Default table-first queue for high-volume ticket scanning, without a visible view toggle on the Open Tickets page.
- Two-screen workflow: Ticket Queue for scanning, Ticket Detail for working one ticket deeply.
- Tighter cards, smaller badges, consistent spacing.
- Subtle hover and selected states.
- Blue/cyan selected ticket accent with small violet accents reserved for RepOS Assist and automation states.
- Official RepOS palette should live as root CSS variables: Navy `#061432`, Deep Blue `#0A3DCC`, Blue `#1674F4`, Bright Blue `#1E8BFF`, Cyan `#19C9FF`, Violet `#4B22E8`, Soft Background `#F7FAFC`, Card `#FFFFFF`, Border `#DDEAF5`, Muted `#637083`, and Text `#061432`.
- Use the main brand gradient sparingly for small accent/active details, not every button or card.
- Amber/yellow internal note styling.
- Minimal clutter and no oversized hero/landing-page treatment.
- Main workflow surfaces should avoid visible build-language such as mock, demo, sample, prototype, test data, fake, static, or MVP. Recovery/reset tools belong under Admin or Settings, not the main queue workflow.
- The top bar should stay focused on core SaaS actions: search, admin-only RepOS Assist, New Ticket, and profile/settings access. Secondary visibility controls should live near the surface they affect.
- Must fit cleanly at 1440x900 without page-level horizontal scrolling. The table may scroll inside the queue when many operational columns are visible.

## Support Workflow This App Should Improve

The workflow is:

1. A rep lands on the Ticket Queue screen.
2. The rep opens Tickets from the primary sidebar, then chooses a ticket tab: Open, Assigned To Me, or Closed.
3. The rep searches the main queue, sorts from the compact controls when available, or uses the Closed tab date range when reviewing finished tickets.
4. The rep searches or filters by ticket, customer, email, model, order, note, internal issue category, status, or source.
5. The rep scans the dense ticket table for volume work.
6. The rep opens a ticket, moving to the Ticket Detail screen.
7. The detail main column shows the conversation thread, internal notes, timeline events, status control, assignment override, and reply editor.
8. The detail right column shows the support context needed to avoid leaving the ticket:
   - Smart diagnosis
   - RepOS Assist for admins
   - Macros
   - Customer history
   - Order/warranty status
   - Product/model details
   - Attachments/photos
   - Troubleshooting checklist
   - Guardrails
   - Manager context
9. The rep inserts a macro or writes a reply/internal note.
10. Admins can open RepOS Assist as a conversational chat drawer. The Admin/top-bar launch opens Global RepOS Assist with no ticket context, while the Ticket Detail Use RepOS Assist button opens Ticket RepOS Assist with only the currently opened ticket context.
11. RepOS Assist should use approved RepOS Knowledge Vault files once backend file storage/parsing is connected. Until then, it should show when no approved RepOS Knowledge Vault sources are available and avoid treating unapproved files as trusted source material.
12. The rep returns to the queue or continues the follow-up workflow.
13. When a rep manually creates a ticket, RepOS keeps the form short, assigns the ticket to that creating rep, records "CS14 Robert created this ticket manually." in the timeline for the default admin user, and prepares an outbound customer notification email from the workspace support mailbox. Incoming-email style assignment checks active eligible reps mentioned in the subject, then prior customer history by email address, then randomly assigns unowned emails with no history to an eligible active rep.

The system should reduce repeated customer questions, missed follow-ups, overpromising, and time spent searching old cases.

## Main Screens And Components

Current prototype has several main screens:

- Sidebar:
  - Current RepOS icon-only mark from `assets/tessario-mark.svg`
  - Workspace label for iSpring Water Systems
  - Dashboard
  - Tickets
  - Admin, visible only to CS14 Robert
  - Settings
  - Polished workspace switcher footer for iSpring Water Systems

- Top bar:
  - iSpring workspace logo
  - Workspace: iSpring Water Systems
  - Global search
  - `/` keyboard shortcut hint
  - RepOS Assist button
  - Copy ticket link
  - New Ticket
  - Clickable CS14 Robert user profile control

- Metric strip:
  - My open
  - All open
  - Overdue SLA
  - Closed
  - Customer replies
  - Follow-ups
  - Average first response

- Dashboard screen:
  - Main RepOS support-health view, inspired by OST's dashboard structure but redesigned for real support decisions instead of random activity tracking.
  - Top filter bar for timeframe, department/team, rep, product family, channel/source, status, and refresh.
  - Key metrics for New tickets, Open tickets, Closed tickets, customer replies, SLA due soon, Overdue, Avg first response, Avg resolution, Reopened, and Needs action with small trend indicators.
  - Clean ticket activity chart focused on Created, Closed, Reopened, SLA risk, and Customer replied.
  - Needs Action section for customer replies without rep response, SLA due soon, overdue tickets, stale tickets, follow-up due, and missing required info.
  - Rep workload table with active tickets, new assigned today, overdue, SLA due soon, avg first response, avg resolution, assignment eligibility, and workload bars to support AI fair assignment.
  - Product/category trends by product family, model number, and issue type.
  - SLA / Response Health and Stuck Tickets sections for manager/admin review.

- Ticket Queue screen:
  - Full workspace queue with a clean Open Tickets title, search bar, Open / Assigned To Me / Closed tabs, sortable table columns, and a Closed-tab-only date range dropdown.
  - Tickets tabs are Open with a count badge, Assigned To Me with a count badge, and Closed without a main count badge. SLA overdue remains an indicator/filter concept, not a main status tab.
  - When Closed is selected, the Closed date range dropdown shows Today, Yesterday, This Week, and This Month with counts.
  - The primary queue table emphasizes Ticket #, Last Updated, Emails, Subject, From, Assigned To, and Status for faster scanning.
  - The right selected-ticket preview panel shows ticket number, status, subject, customer name, email, phone, assigned rep, model, order number, purchase source, receipt status, warranty status, last updated, and a clean Open ticket action.
  - The right selected-ticket preview panel does not show the latest email/message body or customer-message snippet.
  - Compact metrics are visible above the queue.
  - Full ticket conversation and context panels are hidden so reps can focus on scanning.

- Ticket Detail screen:
  - Back to queue button.
  - Main column with ticket number, subject, status, assigned rep, manual reassignment, clickable customer history, full thread, quiet compact timeline activity rows, internal notes, macro insert, helpdesk-style reply editor, attachments, and draft/send actions.
  - Right column with admin-only RepOS Assist, Next Best Step guidance, customer profile, order/warranty, product/model, macros, attachments, checklist, guardrails, manager view, and similar tickets.
  - RepOS Assist opens as a larger conversational chat drawer rather than taking over the screen.
  - The Ticket Detail Use RepOS Assist button opens the same shared chat UI in Ticket mode, shows "Using Ticket #[number] context," and uses ticket subject, thread, customer, model, product family, notes, and status for responses.
  - RepOS Assist is mock/static for the MVP and should not require an API key.
  - RepOS Assist should not be called ChatGPT in the UI.

- Admin screen:
  - Admin-only hub for RepOS Assist, Knowledge Vault, Macros, Assignment Pool / Reps, and Workspace Settings.
  - CS14 Robert is the admin user.
  - Shows the AI Assignment Pool with rep name, role, active ticket count, closed ticket count, assignment eligibility, enable/disable, remove, and reassignment controls.
  - Disabled or removed reps are excluded from future AI assignment. Disabled reps keep existing tickets.
  - Removal is blocked with a warning when the rep still owns active tickets.

- RepOS Knowledge Vault screen:
  - Upload-based workspace source library that starts empty.
  - Empty state says "No knowledge files uploaded yet." and asks admins to upload manuals, policies, macros, troubleshooting guides, or other source files to power RepOS Assist.
  - Admins can upload PDF, DOCX, TXT, CSV, XLSX, PNG, and JPG files from their computer. Static MVP stores file metadata only in localStorage.
  - After upload, admins are prompted to approve the file for RepOS Assist now or keep it as a draft.
  - Uploaded file list shows file name, file type, size, upload date, uploaded by, category, status, Approved for RepOS Assist yes/no, Internal only, Customer-facing allowed, and actions for view, approve, edit metadata, and remove.
  - Metadata includes title, category, description, owner, uploaded by, upload date, last reviewed date, AI approval, internal-only flag, customer-facing flag, and source status.
  - Source statuses are Draft, Needs Review, Approved, and Outdated.
  - Only admins can upload, remove, approve for AI, and mark files outdated.

- My Profile modal:
  - Account, Preferences, Signature, Notifications, Assist, and Workspace tabs.
  - Account tab stores CS14 Robert profile fields, authentication mock controls, admin badge, and avatar placeholder.
  - Preferences tab applies practical local settings such as default queue view, compact rows, metrics visibility, theme, accent color, density, default sort, and default landing view.
  - Signature tab stores a personal signature and default signature option for the reply composer.
  - Notifications tab stores mock assignment, customer reply, overdue, mention, AI assignment, notification style, and quiet-hours preferences.
  - Assist tab stores mock toggles for enabling RepOS Assist, ticket context, draft insertion, and required rep review.
  - Workspace tab shows iSpring Water Systems, 3-CS, Support, Admin role, assignment eligibility, workload count, and admin-only assignment-pool access.

- Modal:
  - Create ticket manual-entry form with required customer name, customer email, subject, and message/reason fields, plus Advanced details for phone, model, order number, purchase source, and issue type.
  - Manual Create Ticket opens outbound-first tickets even when the customer has not emailed first, adds the generated support notification to the ticket thread, and keeps the MVP behavior front-end/mock only.
  - Customer History modal that matches tickets by email address only.
  - My Profile modal for local profile/settings customization.

## Important Demo Workspace Rules

Keep these rules in mind for future work:

- The app should stay desktop-first.
- Use a dark navy sidebar and light main workspace.
- Keep the official RepOS color system consistent across sidebar/header, main background, cards, buttons, badges, queue tables, reply composer, and profile/settings forms.
- The primary workflow must be Ticket Queue first, Ticket Detail second.
- RepOS is the software product brand.
- iSpring Water Systems is the active demo workspace/customer, not the product name.
- iSpring-specific values belong in the mock `workspaceConfig` object, not in generic RepOS section names or hardcoded app copy.
- Keep iSpring mock tickets, macros, product/model data, warranty/return/review rules, and guardrails as the default demo workspace. RepOS Knowledge Vault should start empty and be populated by admin uploads.
- Mock tickets should be realistic iSpring support cases, not generic IT tickets.
- Mock ticket history should include hundreds of realistic iSpring tickets across several customer emails so Customer History, repeat-customer assignment, attachment previews, and long-thread behavior can be tested.
- First load must always show the realistic mock tickets; do not allow stale local data to produce an empty queue or zero metrics.
- Saved/mock browser state should be schema-validated before reuse.
- Default queue mode is a table so support reps can scan many tickets quickly.
- Default saved view should show open tickets.
- Opening a row/card should switch into Ticket Detail rather than showing the full conversation on the queue screen.
- The queue screen should stay clean: title, tabs, queue search, ticket table, and a brief right selected-ticket preview panel without latest-message body text.
- Customer account mock state should keep receipt metadata and warranty registration by customer email address so reps do not ask customers to resend receipts or repeat registration details that are already on file. Receipt uploads can be PDF, PNG, JPG, or JPEG via file picker, drag/drop, or pasted screenshot metadata.
- RepOS Assist should detect purchase source clues for new/imported tickets and write timeline events when it identifies Amazon, iSpring direct, Home Depot, Lowe's, Walmart, eBay, or Unknown.
- Macros are a core rep workflow and should remain close to the reply editor and context panel.
- RepOS Assist is an admin-access internal support copilot using one shared chat UI for Global and Ticket modes. Admin launch controls open Global mode with the label "General assistant" and no ticket number, subject, model, product family, status, or ticket history. Ticket context is available only after opening a ticket and clicking Use RepOS Assist from Ticket Detail as an admin.
- RepOS Assist must show RepOS Knowledge Vault source availability in a small collapsible Sources area separate from message content and keep a safety note that reps should verify warranty, pricing, stock, compatibility, and policy details before sending.
- If no approved RepOS Knowledge Vault files exist, RepOS Assist should show "No approved RepOS Knowledge Vault sources available yet."
- If an approved iSpring master document exists, RepOS Assist should show "Knowledge source available: iSpring Master Support Document."
- RepOS Knowledge Vault is the future approved workspace source library for RepOS Assist, but the static MVP does not parse file contents. For MVP behavior, approved filenames containing "iSpring" or "Master Support" are treated as the approved iSpring support source. Real PDF/DOCX parsing requires backend file storage and extraction later.
- Next Best Step guidance should be based on product family, model, issue tags, and support history, using plain support language.
- Assignment should route manually created tickets to the creating rep. Incoming-email style assignment should check subject-mentioned active eligible reps, then repeat-customer history by email address, then randomly choose from active eligible assignment users.
- Active assignment workload status is Open.
- Closed tickets should not count toward active assignment workload. Legacy Resolved data displays as Closed.
- Customer History must match by `customer.email` only, not by name, phone, or address. If a rep edits a customer email, the app should warn that changing email may affect linked ticket history before applying the change.
- Customer History should stay a compact single-page account view with Customer profile, Ticket history, Receipts & warranty, and Account notes sections rather than a tabbed layout.
- Newly composed tickets should always create the next available persisted six-digit ticket number, display it as `Ticket #100001`, and never reuse numbers already issued in localStorage.
- Guardrails should help reps avoid overpromising.
- Customer, order, warranty, and product panels should be visible without leaving the ticket.
- Internal notes must be visually distinct and clearly labeled.
- Urgent and overdue tickets should be obvious but not visually obnoxious.
- Default state should always show real mock tickets and select a visible ticket automatically.

## Current Mock Ticket Themes

The current prototype includes realistic ticket topics such as:

- RCC7P-AK tank not filling
- RO500AK beeping after filter replacement
- WGB32B pressure drop throughout house
- WGB32BM manganese still showing after install
- WCS45KG no water in brine tank after startup
- UVF55FS ballast alarm/lamp not turning on
- WSP50ARB low flow due to sediment screen
- Warranty registration missing receipt
- Amazon damaged shipment replacement request
- Water test recommendation for well water with iron/manganese/hardness

## Future Integration Direction

Later versions may connect to:

- Support email inbox
- Real AI assignment service and skill-based routing rules
- Real user, role, and permission administration
- Existing OST ticket data import
- Order system
- Warranty registration database
- Inventory/replacement parts system
- Shipping/tracking system
- iSpring product knowledge base
- Customer review tracking
- Amazon/Home Depot source notes
- AI diagnosis/reply assistance

## Workspace Configuration Direction

RepOS core features should remain customer-agnostic:

- Ticket queue and ticket detail
- Customer history
- Reply composer and macros
- AI assignment and admin assignment pool
- User profile/settings
- RepOS Assist and RepOS Knowledge Vault
- SLA/follow-up views
- Reports and metrics

Workspace-specific configuration should contain:

- Company/workspace name
- Departments and reps
- Macros and RepOS Knowledge Vault uploaded source files
- Product/model data
- Warranty, return, and review rules
- Ticket categories and source channels
- Custom fields
- Brand/customer-specific guardrails
- Workspace-specific status/filter labels, source rules, create-ticket defaults, and support mailbox labels
