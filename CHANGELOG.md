# Changelog

## 2026-06-29 (Homepage hero wave + At a Glance chart)

- Replaced the flat CSS dotted hero wave with a canvas-rendered 3D dot mesh: a perspective grid of dots displaced by a rolling sine surface, brightening on crests and fading at the edges, with a subtle drift animation and a reduced-motion static fallback.
- Rebuilt the "At a Glance" mini chart on canvas with a glowing area+line, per-day point markers, y/x axis labels, a highlighted day with a dashed guide line and a value badge, and a left-to-right draw-in animation (reduced-motion safe).

## 2026-06-27 (RepOS Home entry screen)

- Added a RepOS Home screen so opening the app lands on a product-level entry page instead of going directly into the iSpring workspace.
- Added a compact sign-in/continue form, a visible iSpring Water Systems workspace card, and a sidebar Home control for returning to the RepOS entry point.
- Wired the home flow to the existing local dev-login/session path when available, while preserving the browser-local workspace fallback.
- Refined the home screen into a light, white, professional RepOS product entry with restrained brand treatment, feature summaries, and a clean workspace access card.

## 2026-06-27 (clipboard feedback)

- Added a shared clipboard helper so copy actions only show success after the browser accepts the clipboard write.
- Updated macro copy, product/review links, ticket links, queue bulk ticket links, and receipt info copy actions to show clear feedback when clipboard access is unavailable or permission is blocked.
- Verified `app.js` syntax plus backend, backend multi-user, frontend admin-role, frontend merge-workflow, frontend multi-user, and frontend ticket API smoke checks.

## 2026-05-12 (Profile Settings modal tabs)

- Fixed Profile Settings so the modal keeps one stable Account-sized width/height across Account, Preferences, Signature, Notifications, Assist, and Workspace tabs.
- Constrained the profile dialog as a fixed grid shell so the header, tab row, and Save/Close footer remain steady while only the tab content pane scrolls for taller content.
- Added a persistent sliding active-tab bubble using Tessario's shared motion variables, with first-render positioning to avoid a corner-origin jump and existing reduced-motion support.
- Browser-verified tab switching, stable footer placement, content-pane scrolling, and no local console errors.

## 2026-05-12 (Admin and Dashboard scrolling)

- Fixed Admin, Dashboard, and Knowledge Vault scrolling by constraining the reusable full-page panels to the app shell's main content row and letting those panels own vertical overflow.
- Root cause: the fixed-height app shell clipped the active screen area while `.ticket-workspace` aligned grid items to the start. Ticket Queue and Ticket Detail still worked because they had explicitly height-constrained table/conversation scrollers, but Admin and Dashboard rendered as auto-height panels with `overflow-y: auto`, leaving no constrained box for the browser to scroll.
- Kept the left sidebar fixed, preserved the existing Ticket Detail conversation scroller, and kept page footers inside each scrollable content area instead of fixing them to the viewport.

## 2026-05-12 (ticket scroll, receipts, and sidebar tooltip fix)

- Changed Ticket Detail opening so it smooth-scrolls to the latest customer/rep conversation message instead of landing on the reply composer, skipping trailing system events when choosing the target.
- Added deterministic realistic receipt records for mock tickets/customer profiles across Amazon, iSpring direct, Home Depot, Lowe's, and Walmart, tied to customer email, order, model, purchase/upload dates, assigned rep uploader, and warranty registration state.
- Reworked View Receipt into a polished source-specific preview modal with receipt branding, order/customer/model/date/total details, support test labeling, Copy receipt info, Download/open mock file, and Close actions.
- Fixed collapsed-sidebar labels by rendering tooltip text in a body-level high-z-index portal positioned to the right of centered collapsed nav icons so it is not clipped behind the main workspace.
- Browser-verified latest-message ticket opening, Customer History receipt cards, receipt preview layout/actions, collapsed sidebar tooltip layering, and local console stability.

## 2026-05-12 (footer scroll and ticket pagination)

- Moved the copyright footer out of the always-visible workspace shell row and into the scrollable content flow so it only appears after reaching the bottom of the active page content.
- Kept the left Tessario sidebar and right queue preview/ticket tools fixed while preserving the center queue/detail scroll containers.
- Added 50-ticket pagination for Open, Assigned To Me, and Closed queue tabs, including Showing count text, Page buttons, and Previous/Next controls at the bottom of the ticket table area.
- Updated queue search and filters so pagination is based on the full filtered result set, resets to Page 1 when search or tabs change, and hides extra page controls when results fit on one page.
- Updated page changes to clear current-page bulk selection and select the first ticket on the new page for the right preview panel.
- Browser-verified footer visibility, Open/Assigned/Closed pagination, search reset behavior, page-to-preview updates, bulk-selection clearing, and no app console errors locally.

## 2026-05-12 (receipt preview and merge polish)

- Fixed Customer History View receipt actions so they open a receipt preview modal instead of only showing a toast.
- Added a shared receipt preview path for Customer History receipts and Ticket Detail receipt attachments, with PDF-style and image/screenshot-style preview treatments.
- Added receipt preview details for file name, purchase source, order number, model, customer name/email, purchase date, receipt total, uploaded date, and uploader, plus Download/open mock file, Copy receipt info, and Close actions.
- Added 20 deterministic receipt test tickets/customer records covering Amazon PDF, iSpring direct PDF, Home Depot PDF, Lowe's image/screenshot, and Walmart order screenshot examples with unique customer, order, model, source, purchase date, file name, and receipt total values.
- Added a startup migration so existing local demo data receives the new receipt test tickets and customer receipt records without requiring a manual reset.
- Redesigned the ticket toolbar Merge control with a cleaner centered branching merge icon, the "Merge tickets" tooltip, disabled state until two tickets are selected, and matching premium toolbar hover/press styling.
- Browser-verified PDF receipt preview, image receipt preview, Ticket Detail receipt attachment preview, Copy receipt info, merge disabled/enabled state, merge modal opening, and no local app console errors.

## 2026-05-12 (fixed app-shell scrolling)

- Reworked the Tessario app shell so the document/body no longer competes with ticket workspace scrolling; the left sidebar stays fixed in the viewport with the workspace footer visible.
- Fixed Open Tickets layout so the center ticket table is the scroll container while the sidebar, top bar, footer, and selected-ticket preview remain in place.
- Fixed Ticket Detail layout so the center conversation/reply area is the scroll container while the left sidebar and right ticket tools panel remain in place.
- Updated ticket-detail scroll helpers and the floating Reply button to target the conversation scroll area instead of the document window, preserving composer reachability after opening a ticket or adding replies/notes.
- Browser-verified queue table scrolling, fixed side panels, ticket conversation scrolling, reply composer reachability, sidebar collapse behavior, and no app console errors locally.

## 2026-05-11 (osTicket-style Merge icon)

- Replaced the queue toolbar Merge icon with a clearer osTicket-inspired branching merge glyph using two paths joining into the main branch, while keeping the Tessario toolbar button shell, sizing, and stroke treatment.
- Simplified the Merge button tooltip and accessible label to "Merge" so hover text is clean and consistent.
- Preserved selected-ticket behavior, the minimum-two-ticket toast, and the existing merge confirmation modal flow.

## 2026-05-11 (Tessario scroll behavior)

- Fixed Ticket Detail scrolling so the page briefly starts at the top, then smoothly scrolls to the reply composer using the normal document scroll instead of a nested conversation scroller.
- Removed the layout locks that made Ticket Detail trap the thread/composer inside an internal scroll pane and made the right context rail scroll naturally with the detail page.
- Fixed Open Tickets queue scrolling so the ticket table and selected-ticket preview participate in normal page scrolling; the preview action area is no longer sticky and the table wrapper no longer forces a fixed-height vertical scroll pane.
- Root cause: the workspace middle row, queue/detail panels, queue table wrapper, conversation scroll area, and preview/context rails were layered as nested fixed-height or overflow-locked containers. That made the page itself barely move, so the sidebar/preview appeared fixed and Ticket Detail could get stuck between the thread and reply composer.
- Browser-verified opening a ticket, reaching and typing in the reply composer, returning to the queue, scrolling the queue, reopening a ticket from a scrolled queue position, scrolling between thread and composer, and no console errors locally.

## 2026-05-11 (queue Merge icon polish)

- Replaced the queue toolbar Merge control icon with a cleaner two-branches-into-one merge glyph that matches the Copy and Refresh toolbar button stroke style, sizing, and button shell.
- Updated the Merge tooltip behavior so fewer than two selected tickets shows "Select at least two tickets to merge" and two or more selected tickets shows "Merge tickets."
- Preserved the existing selected-ticket bulk actions and merge confirmation modal behavior.

## 2026-05-11 (Customer History receipt cards)

- Simplified Customer History receipt cards so reps see file name, model, order number, purchase source, uploaded/verified receipt status, warranty registration status, uploader/date, and registration by/date only.
- Removed Needs review, confidence badges, confidence fields, extraction-note clutter, and AI/confidence wording from Customer History receipt card presentation.
- Kept receipt upload, Edit details, Mark receipt verified, Register/Unregister warranty, Apply to current ticket, and internal metadata storage intact.

## 2026-05-11 (queue toolbar and footer cleanup)

- Removed the empty selected-count bulk-action pill and placeholder helper text from the ticket queue toolbar.
- Reworked the queue controls into a single clean row where search uses the flexible left-side space and Status, Assign, Merge, Copy, Refresh, Sort, and Reset align to the right.
- Redesigned the Merge, Copy ticket link, and Refresh queue controls as consistent 36px Tessario icon buttons with polished hover/active states and exact tooltips.
- Changed the copyright footer so it is no longer part of the always-visible viewport row; it now appears only after scrolling to the bottom of the main app content.

## 2026-05-11 (Tessario footer copyright)

- Added a subtle centered app footer that reads "Copyright © 2026 Tessario, LLC. All Rights Reserved."
- Placed the footer in the main workspace shell below the active app surface.
- Styled the footer with small muted Tessario SaaS typography rather than an old osTicket-style status bar.

## 2026-05-11 (modern osTicket-style ticket detail)

- Redesigned Ticket Detail into a cleaner osTicket-inspired Tessario workspace with a short header, ticket number/status/email count, customer-history link with count, model/order context, status and assignee controls, and Copy ticket link.
- Added a compact collapsible Ticket Details panel under the header with order, channel, model, purchase source, receipt, warranty, created, last response, and last updated fields.
- Polished the thread lanes so customer messages sit left, rep replies sit right, internal notes are distinct amber bubbles, timeline events read as subtle centered chips, and attachment cards/previews remain inside the related message.
- Modernized the bottom composer with Reply/Internal Note tabs, support mailbox sender, recipients, canned responses, formatting toolbar, attachment drop zone, signature choices, ticket status control, Save Draft, Attach, and Send Reply/Add Note actions.
- Simplified the right sidebar to Tessario Assist, Customer Snapshot, Macros, Product Link, collapsed Order/Warranty, and collapsed Diagnostics.
- Adjusted ticket-open scrolling so the screen starts at the top briefly and then smoothly lands on the latest thread message/reply area instead of jumping straight into the composer.
- Browser-verified Ticket Detail open, Ticket Details expansion, composer tab/editor interaction, right sidebar stack, and console stability locally.

## 2026-05-11 (modern osTicket-style queue toolbar)

- Added a compact Tessario-styled ticket action toolbar above the queue table with Status, Assign, Merge, Copy link, Refresh, and Sort controls.
- Reworked toolbar status behavior so selected rows use the existing bulk status confirmation flow for Open, Closed, and Closed, Waiting On Response, while unselected saved-view options filter the queue for Follow up, Needs receipt, Customer replied, and Overdue without restoring old statuses.
- Added Assign actions for Claim, rep assignment using CS-only names, and a team-assignment placeholder toast, reusing the existing bulk reassignment confirmation path where appropriate.
- Added a mock Merge workflow for selected tickets: fewer than two selected tickets show the requested toast, while two or more selected tickets open a confirmation modal with selected ticket numbers, primary-ticket selection, optional internal note, and merge-review timeline events.
- Tightened the ticket table density and preserved full Ticket # / Last Updated readability, the right preview panel, ticket detail opening, customer history, New Ticket, Tessario Assist, dropdown close behavior, close-row animation, and browser console stability.

## 2026-05-11 (ticket table readable columns)

- Fixed ticket table column sizing after the grid/list row animation change so Ticket # and Last Updated use fixed readable widths and no longer collapse to partial labels or dates.
- Updated the shared queue grid columns for header and rows to stay aligned: compact checkbox/email/status columns, fixed Ticket # and Last Updated columns, a flexible Subject column, and readable From / Assigned To columns.
- Kept ellipsis behavior focused on long Subject and From/customer text while preserving full ticket numbers and date/time labels across Open, Assigned To Me, and Closed tabs.
- Browser-verified Open, Closed, Assigned To Me, the close-row collapse animation, and console stability locally.

## 2026-05-11 (grid-list ticket rows for close removal)

- Replaced the animated queue body with a CSS grid/list row structure while preserving the same visual table header, columns, row density, sorting controls, checkbox selection, row preview/open behavior, and Closed-tab flow.
- Root cause: even with measured FLIP transforms, the visible ticket body was still made of native table rows, so browser table layout could win the final reflow and snap lower rows upward when a closing row left the queue.
- The close path now locks the grid row wrapper to its measured height, starts the row content pop/fade and wrapper max-height collapse together, lets lower block/grid rows glide upward as the wrapper collapses, and only commits/removes the ticket after the shared Tessario 820ms collapse timing completes.
- Removed the table-row FLIP/overlay-clone workaround from the queue close path, kept stable ticket ID keys, avoided `transition: all`, respected reduced-motion timing, and verified single close, bulk close, Closed-tab persistence, no native body rows, and no console errors locally.

## 2026-05-11 (FLIP close-row fill motion)

- Reworked the ticket close row-fill stage to use a FLIP-style transform pass for surviving table rows: first measure sibling row positions, collapse the closing shell into its final layout slot, invert remaining rows back to their old visual positions, then animate their transforms back to zero with the shared Tessario row-fill timing.
- Root cause: the closing ticket pop/fade was polished, but rows below still depended on native table-row height reflow during the shell collapse. That left the lower rows waiting on table layout and could create a visible pause or upward snap when the closed ticket finally left the queue.
- Kept the existing bubble pop/fade timing, stable ticket-id row keys, delayed status commit/removal, no full table remount during close, reduced-motion behavior, bulk-close fallback behavior, and Closed-tab persistence.

## 2026-05-11 (bubble-pop close removal)

- Reworked ticket close/removal into a measured bubble-pop collapse: the overlay clone handles the quick scale-up, soft fade, scale-down, and subtle ripple while the real table row stays in place and collapses its own height.
- Root cause: the previous close path hid the real row and used a separate transform pass to move the remaining rows, so the visual row could disappear before the table layout finished closing the space. That made the queue feel like it paused and snapped upward.
- The close path now adds the closing class immediately, wraps the closing row cell contents for controlled max-height collapse, starts collapse 180ms after the pop begins, runs collapse/fill for 820ms, avoids table remount/refilter during animation, and commits/removes the visible row only after the full collapse completes.
- Kept stable row keys, `closingTicketIds`/pending-status state, reduced-motion behavior, and Closed-tab persistence.

## 2026-05-11 (close timing and Grammarly cleanup)

- Fixed the close-row animation sequencing so the closing row is not removed from the table until the full close/pop/fade plus row-fill motion completes.
- Root cause: the visual close status commit waited for the full animation, but the real table row was removed after the early collapse delay, so the remaining rows could visually jump before the close animation finished. The row now stays as an invisible placeholder while following rows glide upward over the shared 760ms fill/collapse timing, starting as the row begins fading.
- Confirmed the close/pop/fade timing remains unchanged while row collapse and row movement use the 650-800ms target range.
- Removed app-level Grammarly exposure by adding runtime hardening for all text-entry fields, direct `spellcheck="false"` and `data-gramm="false"` attributes on major composers/search/forms, and cleanup for Grammarly-specific injected nodes when they appear inside the app.
- Cursor root cause: source search found no app CSS for `cursor: none`, white/transparent caret color, editable transparent text, `mix-blend-mode`, or Grammarly scripts/integration. The remaining app-side risk was dynamically rendered editable fields without explicit Grammarly opt-out attributes, plus final cursor rules where broad input text-cursor overrides could beat pointer controls for input-like controls. Text-entry fields now force dark text/caret and pointer controls use pointer with matching priority.

## 2026-05-11 (Customer History receipts cleanup)

- Simplified Customer History account summary to high-value customer/ticket counts and moved receipt/order-specific context out of the top profile block.
- Reworked Customer History receipt cards so each receipt shows its own model, order, purchase source, receipt status, warranty status, uploader, upload date, registrant, registration date, and focused receipt/warranty actions.
- Fixed receipt uploader defaults so uploads from a ticket use that ticket's assigned rep instead of hardcoding the current admin profile.

## 2026-05-11 (preview source and topbar polish)

- Cleaned up the queue preview purchase-source display so the right preview panel uses full source labels, maps `iSpring direct` to `iSpring Website`, removes the `Detected by AI` / review wording from the preview, and shows unconfirmed AI-detected sources as `Source / Not Registered`.
- Let the preview purchase-source value wrap cleanly instead of truncating with ellipsis so values such as `iSpring Website` and `Amazon / Not Registered` remain readable.
- Redesigned the top-right action cluster with consistent 38px controls, a sleeker Tessario Assist AI launcher, a cleaner primary New action, a refined notification icon button with count badge, and a more polished CS profile control while preserving the existing Assist, New Ticket, notifications, and profile/settings behavior.

## 2026-05-11 (editable cursor force-fix)

- Force-fixed disappearing/white cursor behavior in typeable fields by replacing the final cursor/caret safety layer with explicit `#061432` text and caret overrides for inputs, textareas, contenteditable fields, reply/composer areas, modal fields, and search inputs.
- Root cause: the shared pointer-control CSS included a broad `label` cursor rule, and the global search label had absolutely positioned `span`/`kbd` adornments sitting over the search input without `pointer-events: none`, so hover hit-testing could land on the label adornment instead of the editable input. The older final safety layer also used `var(--tessario-text)` and missed several semantic composer/modal selectors requested for the hard override.
- Confirmed no project CSS rule sets `cursor: none`, `caret-color: white`, `caret-color: transparent`, editable `color: transparent`, `mix-blend-mode`, or copied browser-extension styling.

## 2026-05-10 (AI receipt review and cursor hardening)

- Fixed the receipt/purchase-source root cause: attachment detection was writing Tessario AI findings into the confirmed `purchaseSource` path and saved customer-account history was automatically flipping ticket receipt/warranty fields. AI detections now stay review-only with `Detected by AI / Needs rep review` labels and possible-source timeline notes.
- Kept receipt and warranty mutations rep-only: saving receipts, applying receipts, verifying receipt details, registering/unregistering warranty, and confirming purchase source still happen through rep actions, while Tessario AI no longer saves account receipts, registers warranty, marks receipt verified, or marks purchase source verified from attachments.
- Re-hardened cursor/caret visibility with a final CSS safety layer for true text-entry fields across reply composer, internal notes, queue/global search, Create Ticket, customer notes, receipt detail modal, profile/settings, Knowledge Vault, and Tessario Assist; body uses the default cursor, disabled fields use not-allowed, and clickable controls keep pointer cursors.

## 2026-05-10 (outbound-first create ticket flow)

- Simplified the Create Ticket modal so only customer name, customer email, subject, and message/reason are visible by default, with phone, model number, order number, purchase source, and issue type tucked into an Advanced details disclosure.
- Updated manual ticket creation to assign the new ticket to the creating rep, add the timeline event "CS14 Robert created this ticket manually." for the default admin user, and remove random-assignment guidance from the modal.
- Added front-end/mock outbound-first behavior: manual tickets receive a unique ticket number, open immediately after creation, add the generated `support@ispringfilters.com` notification email to the thread, log "Customer notification email generated.", and show "Ticket created and customer notification prepared."

## 2026-05-10 (cursor visibility and ticket header dropdowns)

- Re-hardened cursor and caret styling so the body uses the normal cursor, typeable inputs/textareas/contenteditable fields use a visible text cursor with `caret-color: var(--tessario-text)`, and clickable controls keep pointer cursors.
- Extended the editable-field treatment across reply/internal notes, queue and global search, create-ticket fields, customer/account notes, receipt detail fields, settings/profile fields, and Tessario Assist composer fields.
- Redesigned the Ticket Detail status and assigned-rep dropdowns with matching 32px Tessario select styling, aligned chevrons, consistent borders/focus/hover treatment, wider assignee labels, and higher dropdown stacking so menus do not clip behind nearby UI.

## 2026-05-10 (macros, status ownership, attachments, and assignment consistency)

- Rebuilt the daily canned response library around iSpring support macros for Warranty / Receipt, Replacement Parts, RO Troubleshooting, Tankless RO, Whole House, Returns, Reviews, and Water Tests, with short Robert-signed customer-safe copy and ticket/customer/model/link variables.
- Fixed canned response insertion so choosing a macro keeps the user at the reply composer, focuses the editor, places the caret at the end of the inserted text, preserves scroll position, and avoids remounting the full ticket detail.
- Hardened editable field cursor behavior with visible text cursors, dark caret color, text cursors on typing fields, and pointer cursors on buttons/select-style controls.
- Removed the automatic rep-reply status change to Closed, Waiting On Response; status changes now stay manual rep actions except for customer replies reopening closed tickets.
- Updated the automatic customer-reply rule so Closed and Closed, Waiting On Response tickets reopen to Open and log "Customer replied; ticket reopened."
- Added inline ticket-thread attachment previews/cards for customer images, receipt PDFs, order screenshots, install photos, damage photos, and water-test PDFs, plus a mock preview/download modal.
- Expanded seeded mock data to hundreds of realistic iSpring tickets and aligned repeat-customer assignments by email so repeat customers keep the same recent rep unless a reassignment event is recorded.

## 2026-05-10 (rep naming and attachment source verification)

- Reworked internal rep display naming to CS-first-name format across seeded users, tickets, profile/admin copy, assignment surfaces, timeline content, notifications, dashboards, customer history, and macros, while keeping customer-visible signatures as "Thanks, Robert."
- Added legacy rep-name normalization so older localStorage data with previous full-name rep values is converted to the new internal display format.
- Tightened purchase-source logic so verified source detection only comes from receipt/order-proof attachments or saved receipt history, while text-only clues become "Unverified mention" instead of a verified source.
- Added mock attachment scanning for Ticket Detail composer uploads, classifying receipt PDFs, order screenshots/images, photos, and PDFs, then writing either "Tessario AI detected purchase source from attachment: ..." or "Attachment uploaded; purchase source needs review."
- Restyled the Ticket Detail back control as a polished 38px SaaS icon button with centered arrow geometry, subtle border/shadow, hover/active motion, and the "Back to queue" tooltip.
- Widened the Ticket Detail assignee dropdown so CS-first-name rep labels fit cleanly.

## 2026-05-10 (ticket detail behavior polish)

- Enlarged the Ticket Detail Back to queue icon button to a cleaner 38px target with the "Back to queue" tooltip.
- Changed ticket opening so the detail thread starts at the top, then scrolls intentionally to the reply composer, while using an instant non-smooth path for reduced-motion users.
- Updated the right-rail Daily replies macro preview to show the full selected macro in a scrollable preview area while keeping Insert into reply and Copy visible.
- Updated Product Link to show the actual saved Product Link Library URL, show "No saved link found." when absent, and keep Copy link plus Insert into reply visible.
- Reworked System and Tessario AI thread events into compact centered timeline chips with small icons and muted text, leaving customer, rep, and internal-note content as message bubbles.
- Browser-verified Ticket Detail opening, right-rail macro/product-link visibility, timeline chip styling, and console stability locally.

## 2026-05-10 (ticket detail timeline and right rail polish)

- Replaced the Ticket Detail "Back to queue" text control with a compact left-arrow icon button, preserving queue navigation and adding the exact "Back to queue" tooltip.
- Redesigned ticket-thread timeline activity into compact audit-style rows with typed icons and subtle styling for Tessario AI, assignment, status, receipt/warranty, attachment, and general system events.
- Simplified the Ticket Detail right rail so the default visible cards are Tessario Assist, Customer Snapshot, Macros, and Product Link, while Next Best Step, Order / Warranty, extra customer details, and diagnostics live in collapsed sections.
- Shortened the visible Customer Snapshot, macro preview, and product-link cards to reduce right-panel scrolling and removed duplicate receipt/warranty/source details from the default card stack.
- Verified locally that Back to queue, ticket-mode Tessario Assist launch, Customer History, macro insert, product-link insert, Order/Warranty expansion, and browser console stability still work.

## 2026-05-10 (Back to queue animation performance)

- Diagnosed the laggy Ticket Detail Back to queue path: it called the full render flow, revalidated persisted ticket state, refiltered/resorted the queue, rewrote the table HTML, replayed row-enter animations for every ticket row, and combined that with layout-heavy `grid-template-columns` motion.
- Kept the queue table DOM and visible-ticket list warm while Ticket Detail is open, then made Back to queue use a cached view-state return that updates preview/selection state without reloading data or remounting the table.
- Moved the screen transition to the main workspace container with opacity/transform only, suppressed per-row enter animation during the return, avoided new table/container keys, preserved shared Tessario motion timing around 280ms, and kept reduced-motion behavior intact.

## 2026-05-10 (slower ticket close animation)

- Retimed the shared Tessario ticket-row close motion variables so the close pop starts around 280ms, fade lasts about 760ms, and row collapse/fill movement runs about 800ms.
- Kept the existing overlay-clone and transform-based row-fill path so closing starts immediately, rows glide up smoothly, the table avoids a full remount, and the Closed tab still receives the ticket after the full animation completes.
- Updated the JavaScript timing fallbacks to match the shared CSS variables while preserving the reduced-motion fast path.

## 2026-05-10 (queue row highlight behavior)

- Split queue row visual states so clicking a row updates the right preview panel without applying the blue checked-row background.
- Moved the blue selected-row styling to checked checkbox rows only, with unchecking immediately removing the bulk-action highlight.
- Added a subtler previewed-row marker that stays visually separate from hover and checked-row styling while preserving ticket opening from ticket number, subject, double-click, and the preview Open ticket button.

## 2026-05-10 (queue preview restored without message snippet)

- Restored the right selected-ticket preview panel on the queue screen while keeping the queue table balanced beside it.
- Removed the latest email/message body preview from the top of the preview panel, leaving ticket number, status, subject, customer/contact, assignment, model/order, purchase source, receipt, warranty, last updated, and the Open ticket action.
- Preserved the unbadged main Closed tab while keeping Closed date-range counts in the dropdown.

## 2026-05-10 (queue tab cleanup and preview removal)

- Removed the main Closed tab count badge while keeping Open and Assigned To Me count badges.
- Kept Closed-tab date range counts in the dropdown for Today, Yesterday, This Week, and This Month.
- Removed the right selected-ticket preview panel from the queue screen, collapsed the queue layout to one full-width table surface, and kept row, ticket-number, and subject clicks opening Ticket Detail.
- Removed the profile preference that could suggest the queue preview panel was still available.

## 2026-05-10 (ticket row simplification)

- Simplified queue row styling so Open, Assigned To Me, and Closed rows use the same base table treatment, with selected and hover states preserved.
- Removed table unread dots, latest-customer-reply subject bolding, Closed/Waiting subject muting, and row background/accent differences tied to unread, closed, or SLA state.
- Kept the status pill as the visible Open/Closed indicator, preserved subject ellipsis behavior, and verified queue tabs, subject rendering, and console stability locally.

## 2026-05-10 (ticket table subject visibility)

- Fixed missing/hidden Subject text in the ticket table by giving the Subject column first priority, increasing the table's internal scan width, and reducing lower-priority operational columns.
- Hardened the Subject cell layout so subject text and model/order subtext can shrink with clean ellipsis while the unread dot stays in its own small grid slot and cannot push or cover the subject.
- Kept Closed-row subjects visible with normal readable weight, preserved Open/customer-replied emphasis, and verified Open and Closed queue rows plus console stability locally.

## 2026-05-10 (top-bar action polish)

- Redesigned the top-right action area into a tighter paid-SaaS control cluster with consistent 36px sizing, 8px radii, lighter borders, and restrained hover/press motion.
- Restyled Tessario Assist as a compact AI launcher pill, kept New as the slim primary blue action, changed Notifications to a clean line bell with a small unread dot, and kept Profile as an avatar-only settings entry point.
- Preserved existing behavior for global Tessario Assist, New Ticket, notifications, profile/settings, ticket queue, ticket detail, Knowledge Vault, and console stability.

## 2026-05-10 (manager dashboard workload risk)

- Moved Team Workload directly under Manager Priority in Manager View so managers see rep risk before the Needs Action ticket list.
- Expanded Team Workload with active tickets, assigned today, customer replies waiting, overdue tickets, SLA due soon, closed today, oldest open ticket age, assignment eligibility, and Good / Watch / Behind risk levels.
- Added clean amber/red row and chip indicators for reps approaching risk or falling behind, plus row actions to view rep tickets, view overdue tickets, or queue a rebalance review.
- Kept Rep View privacy intact by leaving full team workload/risk details out of Rep View.

## 2026-05-10 (queue subject visibility and tab motion)

- Fixed queue subject rendering so Open, Assigned To Me, and Closed rows keep visible, readable subject text with clean ellipsis truncation for long subjects.
- Kept open/unanswered tickets visually stronger with the existing blue row accent, unread dot, and heavier subject weight, while Closed and Closed, Waiting On Response rows use calmer readable subject styling.
- Fixed the Open / Assigned To Me / Closed tab indicator so the active bubble is kept in the DOM and slides from the previous tab position instead of restarting from the upper-left on every tab click.

## 2026-05-10 (dashboard manager and rep views)

- Added role-aware Dashboard views: CS14 Robert/admin can switch between Manager View and Rep View from a clean dashboard header toggle, while non-admin reps are kept on Rep View.
- Kept Manager View as the "Tessario command center" with all needs-action tickets, SLA/response health, stuck/at-risk tickets, team-level trends, and detailed rep workload metrics.
- Added Rep View as "My support dashboard" with My Priority cards, a My Needs Action table without other-rep assignment columns, and aggregate-only Team Trends.
- Kept Rep View from exposing other reps' individual workload, overdue counts, response-time metrics, or assignment-pressure details.

## 2026-05-10 (closed queue and unread cleanup)

- Replaced the visible Closed date-range pills with one Closed-tab-only dropdown for Today, Yesterday, This Week, and This Month, including current counts in each option.
- Renamed Waiting On Response to "Closed, Waiting On Response" across status display and status controls, and moved those tickets into the Closed tab instead of Open.
- Kept Closed, Waiting On Response tickets out of active workload/Open counts while preserving the ability to reopen them automatically when a newer customer reply arrives.
- Strengthened unread/needs-response treatment in the Open queue with a blue left accent, unread dot, subtle row tint, and heavier subject text instead of relying on bold text alone.
- Confirmed Closed and Closed, Waiting On Response rows use normal read styling and do not show unread dots.

## 2026-05-10 (dashboard simplification)

- Simplified the Dashboard into a cleaner Tessario command center with the requested title, iSpring support subtitle, and refresh action.
- Removed the always-visible dashboard filter row and reduced Today's Priority to four action cards: customer replies waiting, overdue tickets, SLA due soon, and receipt/warranty review needed.
- Kept Needs Action as the main operational table and simplified Team Workload to rep name, active tickets, customer replies waiting, and overdue counts.
- Moved created-vs-closed, product trends, issue trends, channel/source trends, and recent activity into a collapsed More insights section.
- Fixed the blank white pill under the top header by hiding the queue preview panel on Dashboard, Admin, and Knowledge Vault screens.

## 2026-05-10 (queue tab counts and preview cleanup)

- Added compact queue-tab count badges so Open shows the total active open-ticket count across all reps, Assigned To Me keeps the current rep count, and Closed shows the closed-ticket total.
- Replaced the Closed-tab date dropdown with compact date-range pills for Today, Yesterday, This Week, and This Month, each showing its closed-ticket count.
- Simplified the right ticket preview panel by removing Change status, Reassign, Customer history, and the SLA pill from the preview header while preserving the requested ticket summary fields.
- Renamed and restyled the preview CTA to a cleaner full-width "Open ticket" button with Tessario-consistent hover and press motion.

## 2026-05-10 (dashboard command center redesign)

- Rebuilt the Tessario Dashboard around action instead of passive metrics, led by a "Today's Priority" section for customer replies waiting, overdue tickets, SLA due soon, unassigned tickets, escalations, and receipt/warranty review.
- Made Needs Action the core dashboard table with Ticket #, subject, customer, assigned rep, operational reason, last updated, and a Work ticket action.
- Added role-aware dashboard behavior: CS14 Robert/admin sees team workload and system health, while normal reps see their workload and assigned needs-action tickets first.
- Replaced the large line chart with compact weekly widgets for created vs closed, issue type, product family, purchase source, and common models.
- Added specific Trending Issues, Stuck / At Risk, and Recent important activity sections focused on support signals such as escalations, customer replies, closed tickets, receipt uploads, warranty registration, reassignment, and SLA breaches.
- Wired dashboard action cards and trend widgets into the ticket queue search so reps can jump to matching filtered tickets without changing ticket detail, customer history, Knowledge Vault, Tessario Assist, New Ticket, or console workflows.

## 2026-05-10 (closed-ticket bubble pop removal)

- Changed closed-ticket row removal from a left-to-right slide into a restrained bubble-pop micro-interaction: the overlay row scales up to `1.015`, then scales down to `0.96` while fading out.
- Retimed the removal sequence to 140ms for the soft pop, 260ms for scale/fade exit, 180ms before the row gap starts closing, and 400ms for both gap fill and remaining-row movement.
- Kept the existing deferred Closed status commit, transform-only FLIP movement for rows below, reduced-motion fallback, single close, bulk close, and Closed-tab persistence intact.

## 2026-05-10 (slower closed-ticket row removal)

- Slowed the closed-ticket row exit so the row now uses a 700ms slide/fade, a 180ms delayed collapse start, and 500ms collapse/fill timing for the rows moving up.
- Restored the shared collapse-duration token to the close-row sequencing math so the status commit waits for the full visual exit instead of only the slide/fade and fill durations.
- Kept the existing transform/opacity overlay-row approach, reduced-motion fallback, Closed-tab persistence, status-change flow, and bulk-close path intact.

## 2026-05-10 (sidebar and close-row animation performance)

- Diagnosed the sidebar jank as layout-heavy motion: collapse/expand was animating `grid-template-columns`, sidebar padding, and active-indicator width/height while also measuring the active nav item during motion.
- Reworked sidebar collapse/expand so labels hide first, the workspace glides with a transform during the layout state change, active-indicator measurement waits until motion completes, and the indicator now animates transform/opacity only.
- Diagnosed the close-ticket row jank as table layout animation: the row exit was animating table-row height plus cell padding/line-height, then moving remaining rows only after the slow table collapse completed.
- Replaced close-row removal with a fixed overlay row clone for the slide/fade and a transform-only FLIP move-up for the remaining rows, keeping status/list updates deferred until the visual exit completes.
- Confirmed ticket rows still use stable ticket IDs through `data-ticket-id`, closed tickets appear in the Closed tab after animation, and no `transition: all` or browser console errors are present.

## 2026-05-10 (queue status workflow and closed-date filter)

- Added the three visible workflow statuses: Open, Waiting On Response, and Closed across ticket detail, bulk status changes, create-ticket status, dashboard filtering, and queue status display.
- Normalized legacy Waiting Customer tickets to Waiting On Response, legacy Resolved tickets to Closed, and other old active states to Open while preserving escalation and SLA signals as separate indicators.
- Updated queue subject emphasis so subjects are bold only when the latest customer/rep email-style message is from the customer; rep replies, internal notes, system activity, Waiting On Response, and Closed tickets render at normal weight.
- Removed the Open Tickets Show Filters button while keeping the main queue search and existing queue controls stable.
- Added a Closed-tab-only Tessario dropdown for Today, Yesterday, This Week, and This Month, defaulting to This Week so the current mock data shows useful closed-ticket volume.
- Verified locally that Open, Assigned To Me, and Closed tabs render, Closed date ranges filter rows, status dropdowns show the three options, subject response styling updates, and the browser console stays clean.

## 2026-05-10 (ticket close combined exit)

- Refined close-ticket queue removal into a combined slide-right, fade-out, and soft height-collapse sequence.
- Kept the closing row in the current table until the full exit completes, with collapse beginning after 120ms and lasting 340ms.
- Preserved the slower 410ms row slide/fade and 340ms remaining-row move-up timing using shared motion variables.
- Left status commits, queue count refreshes, and Closed-tab visibility deferred until after the visible row exit finishes.
- Maintained reduced-motion support and avoided a full ticket-table remount for normal close removals.

## 2026-05-10 (sidebar glide and row-exit timing)

- Tuned sidebar collapse and expand to glide over a 300ms drawer-style motion instead of snapping after the label fade.
- Restored a smooth main-content/sidebar width adjustment while keeping the per-frame sidebar indicator measurement loop removed.
- Kept collapsed sidebar icons centered with the existing fixed 40x40 nav-item geometry, while labels fade/slide out and return during expansion.
- Slowed close-ticket row removal so the row slide/fade is easier to see at 410ms and the remaining rows move up over 340ms.
- Preserved the close-ticket flow that defers status commits, count updates, and current-view removal until the visible exit completes.

## 2026-05-10 (sidebar and close-row performance fix)

- Removed the sidebar's layout-heavy grid-column animation and per-frame active-indicator measurement after timing confirmed collapse/expand was not caused by ticket-table rerenders.
- Changed sidebar label motion to a staged opacity/transform fade so labels disappear before collapse and return after expand without animating expensive layout properties.
- Tightened collapsed sidebar nav geometry to fixed 40x40 flex-centered buttons so active and hover bubbles stay centered on each icon.
- Reworked close-ticket row removal away from table row/cell height animation; rows now slide/fade out first, then remaining rows move up with a transform-only FLIP pass.
- Kept status commits, queue count updates, and current-view removal deferred until the row exit completes, while avoiding a full ticket-table remount when rows remain visible.
- Removed the temporary performance timing logs after diagnosis and rechecked that no `transition: all` was introduced.

## 2026-05-10 (sidebar motion polish)

- Smoothed left-sidebar collapse and expand with shared motion tokens, a 220ms sidebar timing variable, cleaner label fade behavior, and no `transition: all`.
- Added a measured sliding active indicator for the primary sidebar nav so Dashboard, Tickets, Admin, and Settings glide between active states instead of swapping backgrounds instantly.
- Fixed collapsed-sidebar icon geometry so nav buttons use centered icon bubbles with centered active/hover treatments and no leftover label/badge spacing pushing icons off-center.
- Made Settings an explicit active sidebar state while the profile/settings modal is open and added a one-shot 420ms gear spin when Settings is selected, with reduced-motion support.
- Verified locally that collapse/expand, active indicator movement, Settings selection/spin state, New Ticket modal opening, Tessario Assist launcher stability, and browser console stability pass.

## 2026-05-10 (close-ticket row removal smoothing)

- Fixed the queue close-ticket removal sequence so the confirmation dialog closes first, then the visible row immediately enters its closing state instead of animating behind the modal.
- Tuned the row exit into a staged slide/fade followed by a late height collapse, using a 28px rightward movement and dedicated row motion variables instead of starting the collapse almost immediately.
- Wired the queue preview Change status action back into the status confirmation flow, allowing single-ticket close animations directly from Open and Assigned To Me queue views.
- Kept status persistence, queue count refresh, and removal from the current visible queue deferred until after the exit timing completes, while leaving closed tickets available in the Closed view.
- Verified locally: single close from Open, single close from Assigned To Me, bulk close, Closed tab visibility for recently closed tickets, and no browser console errors.

## 2026-05-10 (dropdown performance and interaction polish)

- Improved Tessario custom dropdown responsiveness by preventing dropdown-only DOM mounts/removals from triggering the app-wide select refresh path.
- Kept dropdown open state local and lightweight, removed duplicate dropdown motion classing, and scoped bulk-action select enhancement to the bulk action bar instead of refreshing every select in the app.
- Smoothed keyboard navigation by updating active option state in place rather than rebuilding the option list on every arrow/Home/End keypress.
- Made option selection update the visible value and close the menu before dispatching the select change, reducing flicker around filters, bulk actions, ticket controls, macros, and settings dropdowns.

## 2026-05-10 (checkbox selection stability)

- Fixed ticket-table checkbox selection flicker by removing the global queue render from row checkbox and select-all changes.
- Added a lightweight queue selection sync path that updates selected IDs, checkbox checked/indeterminate state, and the bulk action bar without rebuilding table rows or replaying row-enter animations.
- Kept bulk action bar show/hide animation intact while preventing checkbox selection from remounting the ticket table or recomputing the full queue render path.

## 2026-05-10 (dropdown stacking fix)

- Fixed custom dropdown layering so bulk status, bulk reassignment, status filters, assignment selects, macro selects, receipt/warranty modal selects, and profile/settings selects render above queue table rows, sticky headers, and selected-row highlights.
- Updated the shared z-index scale so `--z-dropdown` sits above `--z-sticky`, keeping table headers below open menus while preserving the existing drawer, modal, and toast layers.
- Hardened Tessario custom-select mounting with a top-layer/body portal path using the existing dropdown motion and shadow tokens, with a dialog fallback for browsers without popover support.

## 2026-05-10 (Tessario motion system and close-row removal)

- Refactored Tessario's main motion surfaces to use shared transition presets for interactive controls, panels, rows, tabs, fields, dropdowns, and drawers instead of scattered one-off transition lists.
- Applied the shared motion system across sidebar collapse/active nav, top actions, queue tabs, bulk actions, ticket rows, status/reassign modals, New Ticket, Customer History, receipt workflows, Tessario Assist, Knowledge Vault, Profile/Settings/Admin surfaces, toasts, reply tabs, composer controls, and queue search/filter UI.
- Centralized animated shadows and transform distances for lifted/pressed controls, sidebar controls, preview buttons, toggle knobs, drawer surfaces, active tabs, and floating reply actions.
- Confirmed the refactor keeps `transition: all` out of the app and removes hardcoded motion timing, pixel transform distances, and old animated z-index layer literals from the motion surface.
- Added reusable Tessario motion tokens for instant, fast, normal, and slow timings plus standard, in, out, and soft-spring easing variables.
- Added shared motion distance variables, z-index layer variables for dropdowns/sticky UI/drawers/modals/toasts, and shared dropdown/drawer/toast shadow tokens so animated UI has one source of truth.
- Added motion utility classes for `will-change`, motion-safe elements, and reduced-motion fallback elements.
- Tightened reduced-motion behavior so drawer, dropdown, modal, toast, and row-removal surfaces collapse slide/scale movement to opacity-only transitions while preserving functionality.
- Standardized toast, dropdown, modal, drawer, and table-row animation distances to use shared motion variables rather than hardcoded one-off values.
- Added shared motion utility classes for fade, slide, scale, row enter, row remove, and reduced-motion-aware animation use.
- Reworked close-ticket queue removal into an explicit pending state with `closingTicketIds` and `pendingStatusChanges`, so rows lock while removing and ticket counts update only after the exit animation completes.
- Updated single and bulk close flows so Open / Assigned To Me rows slide right, fade, compress height, let lower rows move up with a subtle spring settle, then commit the Closed status and show `Ticket #_____ closed.`
- Preserved Closed-tab behavior: closed tickets remain in ticket data and appear in Closed Tickets, while the Closed view does not animate them away.
- Verified locally that one-ticket close, bulk close, Closed-tab visibility, Tessario Assist, New Ticket, Customer History, receipt modal, dropdowns, tab switching, sidebar collapse/expand, reduced-motion mode, and console stability all pass.

## 2026-05-10 (queue tab animation and bulk action label)

- Added a subtle sliding active indicator for the Open, Assigned To Me, and Closed queue tabs so the selected background moves between tabs over the existing restrained motion timing.
- Kept the queue tab active state lightweight by moving the active background to a persistent indicator while preserving tab counts, hover states, and reduced-motion behavior.
- Widened the bulk action status dropdown so the full "Change status" label is visible without ellipsis while keeping Reassign and Clear selection compact and aligned.

## 2026-05-10 (sidebar icons, typography, and preview action polish)

- Replaced the primary sidebar's filled navigation symbols with cleaner stroke-based line icons for Dashboard, Tickets, Admin, Settings, and the collapse/expand control.
- Added collapsed-sidebar hover/focus tooltips for the main navigation icons and tightened icon sizing, centering, stroke weight, active cyan state, and inactive contrast.
- Polished the app's dense SaaS typography with sharper text rendering, clearer muted text contrast, more consistent label/button/table weights, and improved ticket subject readability.
- Enlarged the queue preview's Open full ticket button into a full-width primary action with stronger padding, centered text, and refined hover/active motion.

## 2026-05-10 (Open/Closed statuses and admin navigation)

- Simplified visible ticket statuses to Open and Closed across queue tabs, filters, table badges, Ticket Detail controls, selected-ticket preview, Customer History, New Ticket, bulk status changes, dashboard filtering, workload counts, and Tessario Assist context.
- Normalized legacy/mock ticket states so Closed and Resolved display as Closed, while New, Waiting Customer, Waiting iSpring, Pending Parts, Escalated, and Overdue display and filter as Open; SLA overdue remains a separate due-time indicator.
- Removed the Dashboard sidebar number badge and reduced the sidebar navigation to Dashboard, Tickets, Admin, and Settings, with admin-only tools accessed from the Admin screen.
- Added Admin launch cards for Tessario Assist, Knowledge Vault, Macros, Assignment Pool / Reps, and Workspace Settings, plus a visible macro library summary inside Admin.
- Reduced Tickets tabs to Open, Assigned To Me, and Closed while preserving table sorting, main queue search, and the Show Filters status filter.

## 2026-05-10 (reply composer tab and editor polish)

- Fixed the Reply/Internal Note segmented control so the sliding pill starts hidden until it is positioned, removing the stray left-edge mark on initial Ticket Detail load.
- Removed inherited tab underline pseudo-elements from Reply/Internal Note buttons so the composer toggle stays clean on initial load, hover, focus, and mode switching.
- Increased the reply editor to a 200px minimum height with vertical resizing and a 320px max height while keeping the formatting toolbar, attachment dropzone, signature options, and send actions aligned below.

## 2026-05-10 (remove priority and table filter row)

- Removed Priority from the visible Tessario workflow: queue columns, collapsed queue filters, Ticket Detail header and controls, selected-ticket preview, queue cards, New Ticket form, searchable ticket context, profile sort options, Assist ticket context, and dashboard timing weights.
- Simplified the queue table to the requested columns: checkbox, Ticket #, Last Updated, Emails, Subject, From, Assigned To, and Status.
- Removed the blank per-column filter row under the table headers while keeping the main Queue search bar, Show Filters panel, status filter, reset action, and sortable table headers.
- Kept bulk status and reassignment actions intact and left the ticket data shape compatible with existing localStorage.

## 2026-05-09 (two-row Ticket Detail header)

- Redesigned Ticket Detail into a tighter two-row header: the first row contains Back to queue, ticket number, status, priority, SLA, email count, and Copy ticket link; the second row contains the subject/customer/model/order stack on the left and compact status, priority, and assignee controls on the right.
- Moved the email-history customer count into the subject context line, still matched only by normalized `customer.email`, so labels such as `Olivia Carter (4)` reflect customer history without changing Customer History behavior.
- Reduced Ticket Detail header padding, control heights, title sizing, and thread top padding so the conversation starts higher while keeping the controls aligned at desktop widths.
- Kept status change and reassignment confirmation flows wired to the existing dropdowns, kept the customer history link and copy ticket link action intact, and made copy-link tolerant of blocked clipboard permissions to avoid console noise.
- Verified locally at 1440x900 that the header renders at about 76px tall, the conversation thread starts at about 147px, status/reassign modals open, customer history opens by email, copy-link toast appears, and the console stays clean.

## 2026-05-09 (bulk action reserved layout fix)

- Added a permanent reserved `#bulkActions` slot inside the Queue controls so selecting tickets no longer inserts a new layout row or pushes the ticket table down.
- Removed the collapsing empty bulk-action state and kept the empty area visually blank while preserving the same fixed height as the visible action bar.
- Updated bulk action show/hide behavior with an explicit exit state: `1 selected`, Change status, Reassign, and Clear selection now fade and lift into place, then fade/slide out using opacity and transform only.
- Tuned the motion to a restrained 180-220ms SaaS-style transition with a subtle spring easing on entry, an ease-in exit, and existing `prefers-reduced-motion` support.
- Verified the queue table top position stays fixed through select, entrance animation, clear, and exit animation; bulk status and reassign confirmation modals still open without console errors.

## 2026-05-09 (compact ticket detail header + customer ticket count)

- Compacted the Ticket Detail header from a 5-row stacked layout (~150px tall) to a 3-row layout (~85px tall): row 1 is the utility strip (Back, ticket ID, status badge, priority badge, SLA, email count, Copy link); row 2 is the subject + status / priority / assignee controls on the right; row 3 is the customer/model/order context line.
- Moved the Back to queue button into the same row as the ticket ID and badges (was previously its own row above) â€” reclaimed ~30px of vertical space.
- Reduced Ticket Detail header padding from `10px 14px` to `8px 14px 9px`. Subject font-size dropped from 17px to 15px and is now single-line with `text-overflow: ellipsis` so the controls always sit beside it on the same row.
- Removed the per-control labels (`Status` / `Assigned rep`) from above the selects in the Ticket Detail header; the current value visible inside each select trigger is the label. Aria-labels preserved for accessibility.
- Reduced Ticket Detail control select height from 34px to 28px and minimum width from 168px to 130px. Priority pill collapses from `min-width: 112px; min-height: 34px` to compact inline-flex sizing.
- Added `ticketCountForCustomerEmail(email)` helper that counts tickets matching the same customer email (case-insensitive, trimmed). Used in the ticket header to render `Carmen Ellis (3)` next to the hyperlinked customer name.
- The customer name + count remains a single button that opens Customer History; matching is by email only, consistent with the existing Customer History matching rule. If the customer has only one ticket, the count renders as `(1)`.
- Replaced the `/` separator in the customer/model/order line with `<span class="ticket-context-sep">/</span>` styled in `var(--line)` so the dividers are visually quieter without losing structure.
- Conversation thread now starts higher on the screen, since the header is shorter; no other layout changes were needed.

## 2026-05-09 (bulk action bar appear/disappear animation)

- Added a smooth fade + slide-down + subtle scale animation to the queue bulk action bar (`1 selected`, Change status dropdown, Reassign dropdown, Clear selection button). When one or more tickets are checked, the bar fades in from `opacity: 0; translateY(-4px); scale(0.985)` to neutral over `--motion-normal` (180ms) `--ease-out`. When selection is cleared, it animates back out before being removed from the DOM.
- Implemented via a `.shown` class toggle on `.bulk-actions`. The base state is the hidden state; adding `.shown` triggers the transition to visible.
- Reworked `renderBulkActions()` so it has three paths: (1) not visible â†’ fade out then clear innerHTML after 220ms; (2) visible and already shown â†’ only update the `1 selected` count text in place to avoid re-running the entry animation on every checkbox toggle; (3) first-time show â†’ render the full HTML, force a reflow with `void el.bulkActions.offsetWidth`, then add `.shown` so the transition kicks in from the base state.
- Set `transform-origin: 100% 50%` so the slight scale grows from the right edge, matching the right-aligned bar position in the queue controls grid.
- Layout-stable: the parent `.queue-controls` grid row height is set by the taller `queue-search` column, so the bulk bar appearing/disappearing never reflows the row.
- Reduced motion is respected via the existing global `prefers-reduced-motion: reduce` rule that collapses all `transition-duration` to 1ms.

## 2026-05-09 (ticket detail layout â€” thread-first scroll redesign)

- Removed the sticky reply composer from Ticket Detail. The composer now lives in the natural document flow at the bottom of the conversation thread so the reading area is no longer compressed.
- Changed `.detail-screen .conversation-panel` from a 3-row grid (`auto | minmax(0,1fr) | auto`) to a 2-row grid (`auto | minmax(0,1fr)`): the header row stays fixed at the top, the second row is a new `.conversation-scroll-area` that handles all scrolling.
- Added `#conversationScrollArea` wrapper div inside `.conversation-panel`. Both the thread and the reply-dock are children of this scroll area so the entire conversation + composer scrolls as a single document column.
- Removed `position: sticky; bottom: 0; z-index: 7` from the `.reply-dock` polish rule. The dock now sits below the last message and is reached by scrolling.
- Added `overscroll-behavior: contain` to the scroll area to prevent scroll chaining past the panel edges.
- Changed `scrollConversationToBottom()` to target `#conversationScrollArea` instead of `#ticketThread`.
- Added `scrollToLatestMessage()`: on ticket open, scrolls the area just enough to bring the bottom edge of the last message into view â€” the composer is below it but not forced into view, per the spec.
- Added `shouldScrollToMessage` flag (separate from `shouldScrollThreadToBottom`). `openTicketDetail` now sets `shouldScrollToMessage = true` (scroll to last message). Sending a reply or adding an attachment sets `shouldScrollThreadToBottom = true` (scroll to full bottom including the composer, so the rep can immediately type again).
- Added `.reply-float-btn` floating pill button (`Reply â†“`) positioned absolutely inside `.conversation-panel` at `bottom: 22px; right: 20px`. The button fades in when the scroll area is more than 180px from the bottom. Clicking it smooth-scrolls to the composer.
- Removed heavy upward `box-shadow` and `border-top` opacity from the non-sticky dock. Now uses a clean `border-top: 1px solid var(--line-soft)` separator only.
- Increased reply-dock bottom padding to 24px so the form has breathing room when scrolled to the end.
- Removed `min-height: 0` and `scroll-padding-bottom` from `.detail-screen .thread` (they were needed for the constrained-scroll model, not for natural-flow).
- Added `overflow-y: visible` override on `.detail-screen .thread` to prevent the base class `overflow-y: auto` from creating a nested scroll context inside the outer scroll area.

## 2026-05-09 (reply composer identity + interaction pass)

- Replaced the From field select (which exposed the rep's personal hotmail address and display name) with a static `support@ispringfilters.com` label â€” the only customer-visible sender address.
- Updated `workspaceConfig.supportMailbox` from the placeholder `ispring-support@tessario.example` to `support@ispringfilters.com`.
- Added `repLabel()` helper that returns `CS14  Robert` (extension + first name) for internal rep attribution; rep messages in the thread now show `CS14  Robert` instead of `CS14 Robert`, keeping last names out of the UI.
- Added a sliding pill animation to the Reply / Internal Note segmented tab: a `.reply-tab-pill` element animates `left` and `width` at 170ms / `ease-standard` between the two buttons. Pill is positioned by `positionReplyTabPill()` â€” instant on initial render, animated on tab switch. Switching tabs no longer re-renders the full conversation, so the animation actually plays. Respects `prefers-reduced-motion` via the global 1ms transition override.
- Fixed formatting toolbar (Bold, Italic, Underline, Bulleted list, Numbered list, Link): buttons now listen on `mousedown` with `e.preventDefault()` to keep textarea focus and preserve the text selection before the click fires â€” without this, clicking a toolbar button deselected the text and wrapping always inserted a placeholder instead of the selected text.
- The Attach button and attachment dropzone already correctly open a hidden `<input type="file">` picker and log attachments to the ticket timeline; no change needed.
- The Send Reply button was already correctly disabled until text exists via `syncComposerState()`; no change needed.

## 2026-05-09 (animation polish pass)

- Replaced `--motion-fast: 140ms` and `--motion-med: 190ms` with a three-tier system: `--motion-fast: 120ms`, `--motion-normal: 180ms`, `--motion-slow: 220ms`, plus named easing variables `--ease-out`, `--ease-in`, and `--ease-standard` with backward-compat aliases for all existing usages.
- Fixed sidebar collapse so nav labels and brand copy fade out with a `max-width + opacity` transition instead of snapping to `display: none`, eliminating the label-jump on collapse. Added `overflow: hidden` to the sidebar to clip content during the width animation.
- Fixed Tessario Assist drawer open/close: open now uses `--ease-out` (smooth deceleration), close uses `--ease-in` (proper acceleration), both at `--motion-slow` for a full-panel slide that does not feel rushed. Added `will-change: transform`.
- Fixed dropdown menus: `.closing` state now animates opacity and transform back to initial position with `--ease-in` instead of only blocking pointer events. Open/close timing standardized to CSS variables.
- Fixed toast exit direction: was exiting downward (same as enter), now exits upward with `translateY(-8px)` and `ease-in`.
- Added `@keyframes modal-out` and `.modal.closing` CSS rule so all five dialog modals (New Ticket, Profile, Customer History, Knowledge File, Workflow Confirm) animate closed instead of snapping away. Added corresponding `animateDialogClose` JS helper.
- Updated all modal `cancel` event listeners to `e.preventDefault()` so Escape key also triggers the animated close rather than the browser's instant close.
- Fixed queue row remove animation: exits with full opacity 0 instead of partial, uses `--ease-in`, and no longer conflicts with the row's base transition.
- Fixed row fill-up animation: removed the spring overshoot (`1.06` easing), now uses a clean `--ease-out` settle.
- Fixed row collapsing cell transition: replaced hardcoded `220ms` with CSS variables, removed height animation (expensive layout property), kept `padding` and `line-height` with `--ease-standard`.
- Added subtle lift effect (`translateY(-1px)`) to active reply/internal-note tabs.
- Improved ticket row hover: replaced `translateX(1px)` with a `box-shadow: inset 2px 0 0` left-edge accent for a cleaner, layout-stable hover signal.
- Standardized all remaining hardcoded `150ms ease-out` values in dropdown triggers and options to CSS variables.
- Standardized `customer-link` and `ticket-card chip-row` transitions to CSS variables.

## 2026-05-09

- Fixed ticket row navigation so row, ticket-number, and subject clicks open the clicked ticket's actual ID instead of falling back to the first visible ticket.
- Fixed customer account derivation so warranty receipt lookup uses the account currently being built and no longer reads `customerAccounts` before initialization.
- Aligned mock ticket schema validation with the visible thread renderer so long-thread timeline records no longer force a reseed on every render and wipe out the selected ticket.
- Added a hidden `window.TESSARIO_DEBUG_TICKET_NAV` console diagnostic for ticket navigation checks, reporting `clickedTicketId`, `clickedTicketNumber`, and `openedTicketNumber` only when explicitly enabled.
- Bumped the ticket workspace storage key to reseed stale browser ticket data after the navigation and validation fix.
- Fixed the queue/detail email-count mismatch by calculating both counts from the same visible ticket-thread helper.
- Removed the system-activity fallback from email counts so only customer and rep email-style messages are counted; internal notes and timeline rows are excluded.
- Added singular/plural email-count labeling, clean Ticket Detail count-pill debug attributes for `emailCount`, `visibleEmailMessages`, and `totalThreadItems`, and bumped the workspace seed key to clear stale mismatched browser data.
- Added an Emails column to the ticket queue between Last Updated and Subject so reps can spot long back-and-forth cases from the table.
- Added a shared customer/rep message-count helper that excludes internal notes and only falls back to system activity when no customer/rep message types exist.
- Added compact Emails pills in the queue and an email-count badge near the Ticket Detail header for quick long-thread context.
- Added 10 heavier long-thread iSpring mock tickets with 20+ messages each for stress-testing Ticket Detail scrolling, sticky composer spacing, timeline readability, receipt events, status changes, reassignment events, and long back-and-forth troubleshooting.
- Covered extended support cases for RO tank not filling, high TDS after membrane/filter changes, RO500AK beeping after filter replacement, whole-house pressure drop, WCS45KG brine startup, UVF55FS lamp/ballast alarms, WSP50ARB sediment-screen low flow, Amazon damaged shipment replacement, missing warranty receipt registration, and frustrated return/replacement escalation.
- Replaced the Ticket Detail sidebar's Smart Diagnosis card with a clearer Next Best Step support-helper card showing most likely issue, what to check next, and what result confirms it in plain support language.
- Updated the Ticket Detail sidebar order to show Tessario Assist, Next Best Step, Customer Snapshot, Macros, Product Link, and collapsed Order / Warranty.
- Bumped the ticket workspace storage key so local demo browsers reseed with the extended long-thread ticket set and the Next Best Step sidebar copy.
- Added 15 long-thread iSpring mock tickets with 6-12 conversation entries each for Ticket Detail readability, scrolling, sticky composer, timeline, and long back-and-forth layout testing.
- Covered realistic long-thread scenarios including RO tank not filling, RO500AK beeping/reset loops, whole-house pressure drops, missing warranty receipts, Amazon damage disputes, return-policy frustration, WCS45KG startup/brine issues, UVF55FS ballast/lamp review, WSP50ARB sediment clogging, and high TDS after membrane replacement.
- Added long-thread coverage for frustrated customer tone, replacement parts sent, receipt/warranty activity, internal notes, status changes, assignment changes, attachments, escalated tickets, and overdue tickets.
- Bumped the ticket workspace storage key so local demo browsers reseed with the new long-thread mock-ticket set.
- Upgraded the Ticket Detail messaging layout so the conversation thread is the main focus, the composer stays sticky at the bottom of the detail panel, and the thread has bottom padding/scroll behavior to keep the latest message visible.
- Added automatic scroll-to-latest behavior when opening a ticket and after sending replies, adding internal notes, or attaching files from the composer.
- Redesigned the reply composer with a cleaner SaaS-style container, compact sender/recipient/macro rows, polished segmented reply/internal-note tabs, a modern formatting toolbar, a smaller focused editor, compact attachment control, signature pills, validation messaging, and refined Send Reply / Add Note / Save Draft / Attach buttons.
- Fixed reply composer actions: Reply/Internal Note mode switching, markdown-style bold/italic/underline/list/link insertion, canned-response insertion, mock file attachment flow, draft persistence, empty-send validation, disabled empty send state, customer reply posting, internal note posting, thread scroll after send, and save/send toasts.
- Replaced native-looking select controls with a shared Tessario custom dropdown layer that keeps the real `<select>` controls in place for forms and app logic while rendering polished SaaS menus.
- Added white dropdown menus with soft borders, subtle shadows, rounded corners, Tessario blue selected states, clean hover states, consistent padding/font sizing, and a clear chevron treatment across queue filters, table filters, bulk actions, ticket detail controls, macros, purchase source, receipt/warranty forms, profile/settings, admin, dashboard, and Knowledge Vault selects.
- Added dropdown open/close behavior with click-outside close, Escape close, arrow/Home/End/Enter keyboard navigation, viewport-aware positioning, high z-index menu layering, modal-aware portal placement, and reduced-motion compatibility.
- Cleaned status dropdown options so editable/filterable ticket-status menus show only Open, Closed, Resolved, and Overdue while preserving legacy mock ticket state where it still drives existing queue/history/demo data.
- Added a Product Link Library section to Tessario Knowledge Vault for admin-managed model/source links, with seeded Amazon, Home Depot, Google Review, and Trustpilot entries stored in localStorage.
- Added Product Link Library add, edit, deactivate/remove, search, and platform-filter controls for admins.
- Connected Ticket Detail's Product Link card to the saved Product Link Library so model/source suggestions and review links come from editable library data instead of hardcoded component logic.
- Redid close-ticket removal animation so Closed and Resolved tickets slide right with a light fade, then collapse after exit while lower rows fill upward with a restrained spring-like motion before queue counts update.
- Kept Closed/Resolved tickets persisted in the ticket dataset so they remain available in the Closed view and Customer History instead of being deleted.
- Updated the close-removal toast to `Ticket #_____ closed.`
- Replaced the Ticket Detail right-sidebar Quick Actions card with a daily iSpring Macros card and a Product Link card.
- Added daily macros for warranty receipt requests, completed warranty registration plus review requests, replacement parts sent plus review requests, and review follow-up/update requests.
- Added saved product/review link lookup by model and purchase source, with Amazon link generation, Home Depot links where exact saved links exist, no-saved-link messaging, and Google/Trustpilot review link copy actions.
- Expanded macro variable replacement to include customer name, Robert/rep name, model, ticket number, replacement part, product link, and product/review link values.
- Added 100 more realistic iSpring mock tickets with varied models, product families, customers, sources, statuses, assignees, receipt/warranty states, attachments, and repeat customer histories.
- Bumped the ticket workspace storage key so the expanded ticket data reseeds cleanly in local demo browsers.
- Simplified the Ticket Detail right sidebar to four compact default cards: Tessario Assist, diagnosis guidance, Customer Snapshot, and Quick Actions.
- Removed the extra sidebar Assist prompt buttons so prompt shortcuts live inside the Tessario Assist drawer instead of crowding the ticket rail.
- Moved Order / Warranty into a single collapsed section with order number, purchase source, receipt, warranty, Add receipt, and Register warranty controls.
- Removed duplicate default receipt/warranty/order displays and long AI-assignment text from the visible ticket rail, keeping the right sidebar focused on likely issue, customer coverage, and quick actions.
- Polished the top navigation actions so Assist, New Ticket, notifications, and profile use a cleaner premium pill/icon treatment with consistent height, softer corners, refined shadows, hover states, and active push feedback.
- Replaced the clunky top-bar Tessario Assist button with a sleeker icon-led `Assist` launcher while preserving Global Assist behavior with no ticket-context leakage.
- Added a subtle count badge inside the `Assigned To Me` queue tab so CS14 Robert can quickly see tickets assigned to the current user without bringing back large metric cards.
- Refined Tessario Assist drawer motion with a right-side slide, soft overlay fade, reverse close transition, and reduced-motion compatibility.
- Cleaned up the sidebar by removing the duplicate Tickets plus button, keeping New Ticket as the single manual ticket creation action in the top bar.
- Made Knowledge Vault and Macros admin-only sidebar items, with defensive navigation guards so normal reps cannot open those admin-managed surfaces from the sidebar route handlers.
- Improved the sidebar workspace footer logo contrast by placing the iSpring logo on a subtle bright pill while keeping the compact `Workspace` / `iSpring` footer copy.
- Completed a full production-polish pass across Tessario's shared visual system, including raised surfaces, tighter form controls, cleaner table/header treatments, more consistent modal/drawer shadows, and calmer premium button states.
- Polished Ticket Queue, Ticket Detail, Customer History, receipt upload, New Ticket, Tessario Assist, Knowledge Vault, Admin, and Profile surfaces with consistent Tessario spacing, borders, radius, focus rings, hover states, and soft elevated panels.
- Removed visible implementation-style copy from Knowledge Vault and Assist source messages so those areas read like finished product UI.
- Fixed sidebar active-state polish so Ticket Detail no longer highlights Macros alongside Tickets.
- Redesigned the Edit receipt details modal into a wider production-style form with grouped sections for receipt file, purchase details, customer details, warranty registration, and review/verification.
- Added polished receipt edit modal styling with soft card sections, rounded inputs, Tessario focus states, a branded warranty toggle, sticky action footer, and no cramped horizontal-scrolling grid.
- Improved receipt detail save behavior so turning warranty registration off requires confirmation, turning it on fills missing registered date/by values, and saving records rep verification metadata.
- Polished the sidebar workspace footer so it uses the real iSpring logo, shows only `Workspace` / `iSpring`, and removes the old `iS` placeholder and long footer label.
- Cleaned up collapsed sidebar behavior by removing the separate pinned expand arrow, keeping one footer expand/collapse control, and centering the icon-only collapsed navigation.
- Fixed duplicate receipt metadata by making receipt matching stricter so customer-level fallback records no longer stamp the same source/order/model across every receipt card.
- Added MVP receipt AI extraction based on each uploaded receipt file name and upload metadata, including source, order number, model, customer name/email, purchase date, upload date, uploaded by, status, confidence, and extraction notes.
- Updated receipt uploads to use current ticket metadata only as a low-confidence fallback when the receipt file provides no detectable details, with missing source/order/model marked Needs Review.
- Added per-receipt status metadata for Customer History receipt records.
- Added Edit receipt details on each receipt card so reps can manually update receipt metadata, mark the receipt verified, and adjust the linked per-receipt warranty registration record.
- Synced warranty registered date/by fields back to the individual receipt record and kept Customer History warranty counts tied to registered receipt records.
- Added a top-right notification bell with unread count, filterable notification dropdown, read/unread controls, clear actions, and ticket-opening actions.
- Seeded realistic CS14 Robert notifications for ticket assignment, customer replies, SLA risk, overdue tickets, reassignment, mentions, receipts, warranty actions, Tessario Assist drafts, and assignment eligibility changes.
- Added curated notification hooks for high-value events while avoiding noise from filter clicks, macro insertion, and minor ticket edits.
- Expanded Profile > Notifications preferences for assigned tickets, customer replies, SLA/overdue, mentions, receipts/warranty, Tessario Assist, in-app notifications, and mock email notifications.
- Redesigned the left Tessario sidebar into a sleeker SaaS-style navigation with Dashboard, Tickets, Assist, Knowledge Vault, Macros, Admin, and Settings.
- Moved Open, Closed, Escalated, and Overdue out of the main sidebar so ticket status views live inside the Tickets page tabs with Assigned To Me.
- Added compact sidebar icons, smaller count badges, stronger active states, hover motion, an icon-only collapse control, collapsed tooltips, and a polished workspace switcher footer.
- Added a small sidebar Create ticket button beside Tickets for quick manual ticket creation.
- Added polished app-wide motion tokens with fast Tessario easing and `prefers-reduced-motion` support.
- Added subtle view-transition animation for Queue, Ticket Detail, Dashboard, Admin, Knowledge Vault, and related support screens.
- Expanded button, sidebar, nav, tab, table-row, modal, drawer, and toast transitions with quick hover lift, click push, fade, slide, and selected-state motion.
- Updated table, dashboard, admin, knowledge, and customer-history rows with quiet hover and filtered-row enter animations.
- Improved modal and Tessario Assist drawer motion for Create Ticket, Customer History, Knowledge file details, receipt upload, confirmation flows, and Assist without changing workflow behavior.
- Simplified the Ticket Detail right sidebar so the default visible rail starts with Tessario Assist, Quick Actions, diagnosis guidance, and Customer Snapshot, with Order / Warranty moved into a disclosure.
- Added compact Quick Actions for status change, reassignment, copy ticket link, macro insertion, and escalation near the top of the ticket sidebar.
- Previously moved AI assignment explanation, full customer profile details, full order details, history/notes, receipt/warranty metadata, the full macro library, attachments, checklist, guardrails, manager view, and similar tickets into collapsed sidebar sections; the current ticket rail now keeps only Order / Warranty collapsed.
- Reverted Customer History from the four-tab layout to one compact single-page account view with Customer profile, Ticket history, Receipts & warranty, and Account notes sections.
- Kept the Edit customer action in the Customer profile section while preserving the email-change warning because Customer History still matches by email address only.
- Kept Receipts & warranty combined, with receipt file, source, order number, model, receipt status, warranty registered yes/no, and actions to add receipt, register/unregister warranty, verify receipt, and apply to the current ticket.
- Expanded the default iSpring ticket seed to 25 realistic tickets across several customer emails, including multiple tickets for Harper Stone, Olivia Carter, CS14 Robert test customer, Parker Lane, Dana Mitchell, and Chris Huang.
- Bumped the local ticket workspace storage key so demo browsers reseed the expanded mock-ticket history instead of keeping the older smaller ticket set.
- Compact Customer History into a shorter tabbed account profile with Overview, Tickets, Receipts & Warranty, and Notes tabs.
- Combined Saved Receipts and Warranty Registrations into one Receipts & Warranty section where each receipt card owns its linked warranty status.
- Added compact receipt/warranty cards with receipt filename, purchase source, order number, model, upload metadata, warranty status, registration date/by, and actions to view, verify, register/unregister, or apply to the current ticket.
- Updated Customer History counts so saved receipts count receipt cards and registered warranties count receipts with registered linked warranty records.
- Added Edit customer from Customer Overview with editable name, email, phone, mobile, and address fields, plus confirmation before applying email changes that affect email-keyed history.
- Cleaned up the Create Ticket modal into compact Customer, Ticket Details, Product / Order, and Message sections with clearer spacing and labels.
- Moved Create Ticket assignment guidance into a small helper note near Assigned rep and replaced the old lowest-workload copy.
- Updated manual Create Ticket assignment so the creating rep owns the ticket and the assignment timeline explains that reason.
- Reworked incoming-email assignment logic to check subject-mentioned active eligible reps, then customer history by email address, then random eligible active reps.
- Updated assignment timeline reasons for manual creation, customer history, subject mentions, and random eligible-rep assignment.
- Redesigned Customer History into a customer account profile with Customer Overview, Ticket History, Saved Receipts, Warranty Registrations, and Account Notes sections.
- Expanded the Customer History summary to show total tickets, open tickets, closed/resolved tickets, saved receipts, registered warranties, and last contact date.
- Added an email-matched Ticket History table with Ticket #, Subject, Status, Last updated, Assigned rep, Model, and Purchase source columns.
- Removed contradictory Customer History warranty display so tickets without a registered warranty record no longer surface as registered.
- Improved receipt cards with file name, file type, uploaded date, uploaded by, source, order number, model, receipt status, linked warranty status, and actions for View, Mark verified, Register warranty, and Apply to current ticket.
- Added Apply to current ticket actions for receipt and warranty records, updating the current ticket context and writing timeline entries.
- Added Customer History account notes with an add-note field plus saved note cards showing timestamp and rep name.
- Polished the top queue tabs with quick hover lift, active-state transitions, and a subtle animated underline for Open Tickets, Assigned To Me, Closed, Escalated, and Overdue.
- Made queue-table ticket numbers and subjects explicit clickable controls that open Ticket Detail without changing row preview behavior.
- Made queue-table customer name/email cells clickable so reps can open Customer History directly from the From column while preserving email-only history matching.
- Improved Customer History receipt and warranty behavior so each saved receipt now has a linked warranty registration record.
- Replaced the one-way Customer History warranty registration action with checkbox-style registration controls that can register or unregister each receipt/product record.
- Added confirmation before removing warranty registration status, preserving a pending not-registered warranty record linked to the receipt.
- Updated warranty registration records to show receipt/file name, model, order number, purchase source, registration status, registration date, registered by, and notes.
- Updated Customer History summary counts so saved receipts count receipts on file while registered warranties count only registered receipt/product records.
- Restored the left Tessario navigation sidebar on the Open Tickets queue while keeping the center ticket table visible.
- Restored the right selected-ticket preview sidebar with brief ticket number, status, priority, SLA, subject, latest message, customer/contact details, assigned rep, model, order, purchase source, receipt, warranty, and queue action buttons.
- Kept the queue layout as left fixed navigation, flexible center ticket table, and fixed right selected-ticket preview without bringing back the empty conversation/context panels.
- Removed the temporary Open Tickets debug panel and debug console block after confirming ticket counts and table rendering were working.
- Restored queue row selection behavior so a single row click updates the selected-ticket preview while double-click or Open full ticket opens Ticket Detail.
- Fixed the Open Tickets startup crash caused by customer-account derivation reading `profile` before the profile state was initialized.
- Moved profile loading before customer account loading and reset profile before deriving customer accounts during workspace reset.
- Hardened profile and customer-account loading so invalid profile data falls back to defaults, bad customer account records are skipped, and failed account-history derivation cannot block ticket rendering.
- Verified Open Tickets renders the ticket table headers and rows after the crash fix with no app console errors.
- Added the requested plain-text Open Tickets debug block immediately under Queue search, with totalTickets, filteredTickets, activeQueue, activeTab, searchQuery, ticketsLocalStorageKey, localStorageTicketsFound, firstTicketNumber, tableRenderFunctionCalled, and renderError.
- Logged the same Open Tickets debug block to the browser console on render.
- Kept the debug text visible while confirming the table render function is called, Open Tickets filters return visible rows, and the ticket table headers plus rows render directly under the search area.
- Added an Open queue recovery guard that reseeds the default iSpring ticket set when persisted ticket data leaves the Open queue with no usable active tickets and no active search/filter input.
- Added a visible Open Tickets debug panel directly under Queue search showing total tickets, filtered tickets, active queue/tab, search query, filter visibility, table render state, first ticket id, localStorage ticket-key presence, render errors, and table/ticket-list CSS visibility values.
- Kept the debug panel visible while confirming the queue table renderer is called, the Open queue has ticket data, the Open filter returns rows, the table is not hidden by CSS, and the no-match empty state still shows Clear Filters.
- Added an on-screen Reset ticket data recovery action in the debug panel so corrupted ticket data can be reseeded immediately from the default iSpring ticket set.
- Emergency-hardened Open Tickets ticket-data validation so stale or malformed localStorage arrays missing queue-table/search fields are rejected and reseeded from the default iSpring ticket set before the table renderer runs.
- Temporarily verified queue render diagnostics for total tickets, filtered tickets, active queue, and render-table state, then removed the debug UI after confirming Open Tickets rendered correctly.
- Browser-verified Open Tickets table headers and rows render by default, the no-match state shows "No tickets match this view" with Clear Filters, Clear Filters restores rows, and console output remains clean.
- Restored the Open Tickets queue page to the earlier reference layout by making the Queue screen full-width, keeping the iSpring workspace header/top-bar controls visible, placing queue tabs above the compact queue search row, and keeping the ticket table directly underneath.
- Moved checked-ticket bulk actions into the blank right-side area of the queue search strip, showing the selected count, Change status dropdown, Reassign dropdown from active assignment-pool reps, and Clear selection only when tickets are selected.
- Verified bulk status and reassignment controls use confirmation modals with selected ticket numbers/subjects and optional internal notes, then update ticket state, write timeline events, clear selection, and refresh queue views/counts.
- Browser-verified visible Open Tickets rows, search/table headers, row-to-detail navigation, New Ticket modal, Knowledge Vault, Tessario Assist, and console stability after restoring the queue layout.
- Hardened the Open Tickets table render path so persisted ticket data is normalized before use, empty/all-closed saved ticket data reseeds from the default iSpring ticket set, and invalid queue filter/sort state falls back to safe Open Tickets defaults.
- Added table-container minimum heights so the Open Tickets headers and rows remain visible directly beneath the search/filter controls instead of collapsing into a blank queue area.
- Verified Open Tickets renders the checkbox, Ticket #, Last Updated, Subject, From, Priority, Assigned To, and Status headers with ticket rows, shows "No tickets match this view" plus Clear Filters for no-match searches, and reports no browser console errors.
- Completed an emergency Open Tickets layout recovery by initializing the app in Queue/Table mode, removing the queue preview element from the queue DOM, and making the queue screen a single full-width ticket table surface.
- Reordered the Queue screen so Open Tickets leads into the search controls, optional filters/sort, queue tabs, and then the ticket table, with no empty middle or right panels on Queue.
- Removed Queue-screen-only leftovers from the top bar and DOM, including Hide context, Copy ticket link, Card View, Compact controls, and the ticket preview rail, while keeping Ticket Detail's inline Copy ticket link.
- Changed single-clicking a ticket table row to open the separate Ticket Detail screen.
- Verified Open Tickets load, visible ticket rows, search, Show Filters, row-click detail navigation, and console stability in the browser.
- Fixed the remaining Open Tickets queue regression by removing the missing metric-strip grid row so the queue panel fills the available workspace height and ticket rows are visibly rendered beneath the search/filter controls.
- Removed the top-bar Hide context and Copy ticket link actions from all screens; Ticket Detail now keeps the copy action inside the ticket header as "Copy ticket link."
- Tightened the Dashboard sidebar badge layout so the count badge stays visually separated from the Dashboard label.
- Verified Open Tickets renders visible open-ticket rows by default, the no-match empty state includes Clear filters, and the browser console reports no errors.
- Fixed the Open Tickets layout regression by removing the reserved queue-preview column on the queue screen so the ticket table returns to a full-width page directly under the search/filter area.
- Confirmed the queue screen now hides the empty preview, conversation, and context panels while rendering ticket rows by default with no browser console errors.
- Improved Tessario Assist so Global mode answers normal iSpring support questions conversationally, including RO500 overview, RO500/RO500AK beeping or reset issues, RCC7AK low-flow troubleshooting, whole-house pressure-drop triage, UV alarm intake, water-test guidance, next customer questions, and draft response requests.
- Updated Ticket mode Assist so the same conversational support answers can combine with selected ticket context, while Insert draft remains available only in Ticket mode.
- Changed Tessario Assist Knowledge Vault handling so approved files are recognized when either the Approved status or Approved for Tessario Assist metadata is present, avoiding false no-source messaging after approved uploads.
- Moved approved-file citation copy into a compact source note format using the uploaded file name, such as `Source: iSpring_Master_Support_Document_v1.pdf`, and kept the collapsed Sources section source-aware.
- Added an implementation note in `app.js` that the current Knowledge Vault is metadata-only and real PDF/DOCX/TXT content grounding requires backend file storage, extraction, indexing, and citation.
- Added Customer History receipt uploads for PDF, PNG, JPG, and JPEG files via file picker, drag-and-drop, or pasted screenshot, saving file metadata to the customer email account, marking receipt on file, and writing a ticket timeline event when opened from a ticket.
- Updated Customer History warranty registration to persist registered status, date, source, order, and model by customer email, change the action to "âœ“ Warranty registered," and surface registered warranty status on future tickets from the same email.
- Added repeat-customer assignment for new manually created tickets, assigning to the most recent previous active/eligible assignee for that customer email before falling back to normal AI fair assignment.
- Redesigned Tessario Assist into one larger shared conversational chat UI for both Global and Ticket modes, with natural message bubbles, a bottom textarea composer, Enter-to-send, Shift+Enter line breaks, subtle Suggestions, Copy response, Ticket-mode Insert draft, Clear chat, and a collapsible Sources area.
- Added separate Tessario Assist chat histories for Global mode and each ticket so top/sidebar Assist never inherits ticket context, while Ticket Detail's Use Tessario AI opens ticket-specific context for the selected ticket.
- Updated the Tessario color system to the new logo-inspired palette: Navy `#061432`, Deep Blue `#0A3DCC`, Blue `#1674F4`, Bright Blue `#1E8BFF`, Cyan `#19C9FF`, Violet `#4B22E8`, Soft Background, Card, Border, Muted, and Main Text.
- Retuned the UI theme so dark sidebar/header areas use Tessario Navy, primary actions use Tessario Blue with Bright Blue hover, focus rings use Tessario Cyan, active navigation/table states use restrained blue-violet treatments, and Tessario Assist/automation accents use Violet.
- Completed the product rebrand to Tessario across visible UI, assistant copy, Tessario Knowledge Vault copy, browser metadata, docs, and product branding while keeping iSpring Water Systems as the active workspace/customer.
- Added bulk actions for checked queue-table tickets, including selected count, bulk status change, bulk reassignment, clear selection, confirmation modals, timeline events, optional internal notes, and refreshed queue counts/views.
- Simplified ticket status options to Open, Closed, Resolved, and Overdue across queue filters and ticket dropdowns, normalizing older ticket statuses to the new model.
- Added confirmation modals for ticket status changes and reassignments, including ticket context, optional internal notes, and explicit Confirm/Cancel behavior before updating tickets.
- Tightened the queue search area by correcting the queue grid rows and reducing search-control padding so the ticket table starts closer under the search bar.
- Added compact queue tabs above the ticket table for Open Tickets, Assigned To Me, Closed, Escalated, and Overdue, with active-tab highlighting and table-title updates while preserving search, filters, sort, and the table-only queue.
- Expanded Customer History to show saved receipt metadata and warranty registration records, including saved/registered dates, purchase source, order number, model, and notes from the customer account.
- Revised the Selected Ticket Preview into a brief ticket summary while retaining purchase source, receipt status, warranty status, contact details, assignment, model/order, last updated, and queue actions.
- Added mock Tessario AI purchase-source detection for Amazon, iSpring direct, Home Depot, Lowe's, Walmart, eBay, and Unknown, including automatic timeline events and manual purchase-source updates from Ticket Detail.
- Added localStorage-backed customer account receipt and warranty metadata keyed by customer email, with Customer History and Ticket Detail actions to add receipts, register warranties, and surface receipt/warranty already on file.
- Added a simple persisted ticket-number counter for newly created tickets, starting from the highest existing issued number or `100000`, assigning the next unused six-digit number, and displaying ticket labels consistently as `Ticket #100001` across queue, detail, history, timelines, copy-link feedback, Tessario Assist, and ticket references.
- Simplified the Open Tickets page into a cleaner ticket-table surface by removing the My Tickets, Waiting Customer, Waiting iSpring, Warranty, Replacement Parts, and Review Follow-Up filter chips, removing the Table View display button, and leaving search plus Show Filters as the primary queue controls.
- Cleaned up the Open Tickets queue header so it behaves like a focused ticket table page, removing the top metrics strip, Card View option, Compact checkbox, and Hide metrics control.
- Removed the bordered white card treatment around the iSpring top-header logo so the active workspace logo now sits directly on the header background.
- Fixed iSpring header logo visibility by replacing the washed-out white logo treatment with a visible blue workspace-logo asset in a compact white frame.
- Refined the Tessario sidebar brand alignment so the icon sits vertically centered beside the Tessario text and "Ticketing made clear" tagline with a tighter gap.
- Replaced the top header Tessario wordmark with an iSpring workspace logo and small muted "Workspace: iSpring Water Systems" label so the header represents the active customer while the sidebar remains Tessario product branding.
- Fixed the top header logo layout so the full Tessario wordmark no longer shows duplicate fallback "Tessario" text beneath it, while keeping the workspace label as small muted text and leaving sidebar branding unchanged.
- Added the uploaded full Tessario logo as `assets/tessario-logo.svg` for product-brand treatments while keeping the left sidebar on the transparent icon-only mark.
- Corrected Tessario icon placement so the uploaded icon-only mark is used only in the left sidebar and browser favicon, removed it from the top header, and made the sidebar mark transparent on the navy background.
- Added the newly uploaded Tessario icon-only mark as `assets/tessario-mark.svg` for the sidebar mark and browser favicon while preserving the existing Tessario text, subtitle, and layout.
- Split Tessario Assist into Global and Ticket modes so the top-bar button opens a fresh General assistant with no ticket context, while Ticket Detail's Use Tessario AI button opens ticket-specific context and resets chat when modes change.
- Updated Tessario Assist source awareness so approved iSpring master sources show "Knowledge source available: iSpring Master Support Document" and the no-source message appears only when no approved source exists.
- Fixed Tessario Knowledge Vault approval synchronization so files marked Approved in metadata are also approved for Tessario Assist, existing uploaded metadata is normalized on reload, and Tessario Assist can detect approved uploaded sources reliably.
- Completed a production-polish pass across the main Tessario UI without changing the core workflow.
- Moved the metrics visibility action out of the top bar and into the queue header so the top bar stays focused on search, Tessario Assist, and New Ticket.
- Removed remaining visible build-language from Assist and Tessario Knowledge Vault UI copy while preserving implementation notes in documentation.
- Refined the shared visual system for buttons, panels, cards, empty states, modals, tables, thread messages, and the reply composer.
- Tightened Ticket Detail composer sizing so the conversation thread remains visible on normal desktop viewports.
- Added a Tessario Knowledge Vault post-upload prompt asking admins whether to approve uploaded files for Tessario Assist now or keep them as drafts.
- Added admin-only Tessario Knowledge Vault approve actions and clearer approved yes/no table display.
- Updated Tessario Assist to recognize any approved Tessario Knowledge Vault source and list source names/status in the collapsible Sources area.
- Added MVP mock grounding for approved filenames containing iSpring or Master Support, with docs noting that real PDF/DOCX parsing requires backend file storage and extraction later.
- Removed the visible Reset demo data control from the main sidebar and moved workspace recovery behind Admin and Settings > Workspace.
- Wired the sidebar Settings button into the My Profile settings modal.
- Replaced visible prototype/mock/static wording in the app UI with cleaner Tessario product copy while keeping implementation notes in code/docs.
- Tightened queue table widths, queue control spacing, and reply composer spacing for a cleaner desktop fit.
- Tightened the Tessario/product versus iSpring/demo-workspace boundary.
- Added workspace-config-driven saved queue filters so labels such as Waiting iSpring come from the active workspace configuration instead of the generic queue code.
- Added workspace-config-driven waiting status metrics and create-ticket defaults/placeholders while preserving the iSpring demo values.
- Updated `README.md`, `PROJECT_CONTEXT.md`, and `TODO.md` with clearer guidance that Tessario owns the reusable support workflow while iSpring owns the current demo workspace data.
- Added a main Tessario Dashboard sidebar item and support-health dashboard inspired by OST's structure but redesigned for real support decisions.
- Added dashboard filters for timeframe, department/team, rep, product family, channel/source, status, and refresh.
- Added dashboard metric cards for New tickets, Open tickets, Waiting customer, Waiting iSpring, Escalated, Overdue, Avg first response, Avg resolution, Reopened, and Needs action with trend labels.
- Added a clean Ticket Activity chart focused on Created, Resolved, Reopened, Escalated, Overdue, and Customer replied.
- Added Needs Action, Rep Workload, Product/Issue Trends, SLA / Response Health, and Recent Escalations / Stuck Tickets dashboard sections.
- Added dashboard Open ticket actions that jump into the existing Ticket Detail screen without changing queue/detail behavior.
- Removed Hide context and Copy ticket link from the Queue top-bar view while keeping those controls available on Ticket Detail.
- Removed the queue-preview Copy ticket link quick action so copy-link behavior is detail-focused.
- Updated Queue titles to match the selected queue view, such as Open Tickets for Open and My Tickets only when that view is selected.
- Cleared the seeded mock Tessario Knowledge Vault documents so the vault now starts empty.
- Reworked Tessario Knowledge Vault into an upload-based admin source library for PDF, DOCX, TXT, CSV, XLSX, PNG, and JPG files.
- Added localStorage-backed uploaded-file metadata for file name, type, size, upload date, uploaded by, category, status, AI approval, internal-only, customer-facing, owner, description, and review date.
- Added a Tessario Knowledge Vault metadata modal plus admin-only controls to upload, edit metadata, remove files, approve files for Tessario Assist, and mark files Draft, Needs Review, Approved, or Outdated.
- Updated Tessario Assist to show that approved Tessario Knowledge Vault file answers require backend file parsing and to report when no approved Tessario Knowledge Vault sources are available.

## 2026-05-08

- Created the first static Tessario prototype for the iSpring Water Systems demo workspace.
- Added local static server via `server.mjs`.
- Added a generic ticket queue, ticket details, status controls, comments, and local persistence.
- Reworked the prototype around the iSpring Ticketing System v1 scope.
- Added iSpring-specific ticket fields, customer/product/order/warranty context, macros, internal notes, attachments, guardrails, and dashboard metrics.
- Converted the UI into a desktop-first support workspace with a dark navy sidebar.
- Added the three-column layout: ticket queue, conversation, and right context panel.
- Expanded realistic mock ticket data to cover iSpring support cases.
- Added the original diagnosis guidance panel, macro search, macro insert/copy, attachment cards, missing-info chips, similar tickets, and clear-filters empty state.
- Fixed default mock-data flow so first load seeds 10 realistic iSpring tickets, calculates non-zero dashboard metrics, and selects the first visible ticket.
- Added schema validation for `localStorage` mock data so stale saved data cannot render an empty queue.
- Initially added sidebar/top-bar logo support with fallback text.
- Added project self-documentation:
  - `README.md`
  - `PROJECT_CONTEXT.md`
  - `TODO.md`
  - `CHANGELOG.md`
- Added top-of-file comments to the main app files.
- Redeployed production to `https://ispring-support-hub.vercel.app`.
- Added a sidebar Reset demo data action for restoring the realistic mock queue during demos.
- Polished dashboard metric cards, selected ticket styling, focus states, and context panel accents for a cleaner leadership demo.
- Fixed a `renderMetrics` runtime error caused by an undeclared `value` reference, restoring the dashboard, ticket queue, panels, and controls.
- Fixed first-load state so the Create Ticket modal is always closed until `+ New Ticket` is clicked.
- Simplified the default workspace with 4 primary metrics, quieter ticket cards, essential right-panel cards, and collapsed advanced sections for macros, attachments, checklist, guardrails, manager view, and similar tickets.
- Added collapse controls for the sidebar, metrics strip, ticket filters, and right context panel.
- Reworked the Create Ticket form lifecycle so the form is not present in first-load HTML and is rendered only while `isCreateTicketModalOpen` is true.
- Confirmed modal open/closed state is not saved in `localStorage`, preventing saved browser state from forcing the form open on refresh.
- Rebranded the software product to Tessario and separated the active customer as `Workspace: iSpring Water Systems`.
- Replaced the previous product logo with `assets/tessario-logo.svg` as the current Tessario logo.
- Completed a decluttering polish pass: reduced ticket-card badges, softened metric cards and panel borders, improved panel spacing, tucked customer history into an inline disclosure, and made the conversation composer feel more like a support reply workspace.
- Added a Card View / Table View toggle and made Table View the default high-volume queue mode.
- Added a modern dense Queue Table inspired by the old OST workflow without copying its old UI, including sticky headers, sortable columns, filter row, compact alternating rows, hover/selected states, and small status/priority/SLA badges.
- Added quick queue controls for Open, My Tickets, Search, New Ticket, Use Filters, Sort, and Reset filters.
- Reworked saved views around support operations: Open, Assigned to Me, Waiting Customer, Waiting iSpring, Escalated, Overdue, Warranty, Replacement Parts, and Review Follow-Up.
- Expanded search coverage across ticket number, subject, customer name, email, model, order number, assigned rep, tags, missing info, and conversation message text.
- Added a favicon link to the Tessario logo asset to avoid browser favicon 404 noise during smoke tests.
- Fixed quick queue active states so New Ticket is no longer solid green by default and only the current quick control/view receives the solid green treatment.
- Added a pinned left-edge Expand sidebar control so reps can reliably reopen the sidebar after collapsing it.
- Expanded macros with categories, pinned macros, stronger iSpring-style support copy, one-click Insert/Copy actions, and variable replacement for customer, model, ticket, rep, replacement part, and review link.
- Revised Tessario into a simpler two-screen workflow: Ticket Queue for scanning and Ticket Detail for working one ticket deeply.
- Simplified the sidebar to Open, Closed, Escalated, and Overdue, with secondary queues moved into saved filters inside the Ticket Queue screen.
- Added Back to queue behavior from Ticket Detail and hid the full conversation/context panels from the queue landing screen.
- Added subtle tactile hover/click button motion for queue controls, saved filters, composer actions, macro actions, and navigation buttons.
- Added a Selected Ticket Preview panel to the queue screen with compact ticket details and an Open full ticket action.
- Added Ticket Detail status changing for New, Open, Waiting Customer, Waiting iSpring, Escalated, Pending Parts, Resolved, and Closed.
- Status changes now persist to localStorage, write timeline events, and update Open/Closed/Escalated/Overdue counts immediately.
- Fixed the Create Ticket modal X and Cancel buttons so they close without submitting or triggering required-field validation.
- Standardized the example support rep as CS14 Robert across profile, mock ticket assignees, metrics, timelines, and macro variables.
- Added mock Tessario AI Assignment for new tickets through the assignment pool and writing assignment timeline events.
- Added assignment users and roles, with CS14 Robert as admin and CS1 Nick, CS2 Julius, CS3 Sean, CS4 Jonathan, and CS5 Michelle as eligible support reps.
- Added an admin-only Assignment Pool screen with workload counts, add rep, enable/disable, active-ticket removal warning, and manual reassignment controls.
- Added manual reassignment on Ticket Detail and excluded disabled/removed reps from future AI assignment.
- Updated Create Ticket so each submission creates a unique incremented ticket ID, closes the modal, opens the new ticket, and records creation plus AI-assignment timeline events.
- Replaced the Create Ticket Tags field with Issue type and removed the visible Tags column from Table View while keeping internal issue data for search and diagnosis.
- Added Customer History from Ticket Detail and Queue Preview, matched by customer email address only, with totals and clickable ticket history.
- Expanded the Queue screen Selected Ticket Preview with Customer, Assignment, Product, Order/Warranty, Activity, Missing info, AI Assignment, and quick-action sections.
- Replaced literal table sort direction labels with compact arrow indicators.
- Updated the local preview server console message from PulseDesk to Tessario.
- Refined the Queue screen Selected Ticket Preview so it spans the full queue height, uses a sticky Open full ticket button, infers clearer department/team and purchase-source labels, and keeps empty fields as subtle "Not provided" values.
- Replaced the table header sort glyph text with CSS-drawn sort icons so Last Updated and other sortable columns no longer expose words or stray encoded arrow text.
- Reworked the Open Tickets page into a cleaner OST-inspired Tessario queue layout with compact toolbar tabs for Open, My Tickets, Closed, Search, and New Ticket, subtle filter controls, and a denser primary table.
- Reduced the visible queue table columns to Ticket #, Last Updated, Subject, From, Priority, Assigned To, and Status while preserving the existing search, saved views, table filters, and sort behavior.
- Restyled ticket thread system activity as compact timeline rows so created, assigned, status-changed, reassigned, macro, attachment, and AI-assignment events are quieter than customer and staff messages.
- Redesigned the reply composer into a Tessario helpdesk reply area with From, Recipients, canned response selector, formatting toolbar, large editor, attachment dropzone, signature options, and draft/send controls.
- Added a clickable My Profile settings modal from the top-right profile control with Account, Preferences, Signature, Notifications, and Workspace tabs.
- Added localStorage-backed CS14 Robert profile settings, admin badge, avatar placeholder, mock password/2FA controls, save toast, and top-right display-name updates.
- Added practical profile preferences for default landing view, default queue view, compact/density mode, metrics visibility, ticket preview visibility, sidebar default, theme, accent color, default sort, and auto-open first ticket.
- Added signature preferences with personal signature editing, department preview, default signature selection, and optional insertion into customer replies.
- Added notification preference mock controls and an admin-only Workspace tab action that opens the Assignment Pool.
- Refactored product thinking so Tessario remains the SaaS product and iSpring Water Systems is the active demo workspace/customer.
- Added a mock `workspaceConfig` layer for workspace name, departments, reps, macros, product/model data, warranty/return/review rules, ticket categories, source channels, custom fields, guardrails, review links, and support mailbox values.
- Updated UI/workflow reads for workspace labels, profile workspace facts, create-ticket options, macro data, product diagnosis, checklist, guardrails, similar tickets, replacement parts, and review links to use the active workspace config while preserving the existing iSpring demo data.
- Documented in `PROJECT_CONTEXT.md` that iSpring is the demo workspace, not Tessario itself.
- Added the official Tessario brand color system as root CSS variables.
- Applied Tessario Navy, Deep Blue, Blue, Bright Blue, Cyan, Violet, Soft Background, Card, Border, Muted, Text, brand gradient, and soft active states across the sidebar, header, app background, cards, buttons, badges, queue tables, reply composer, profile/settings forms, and focus states.
- Preserved the existing layout and tactile button push behavior while moving remaining legacy navy/green accents onto the official palette.
- Added Tessario Assist, a built-in mock Tessario AI support copilot for reps.
- Added a top-bar Tessario Assist launch button and a Ticket Detail assistant panel.
- Added a chat-style side drawer with message bubbles, suggested prompts, input, copy response, insert draft, clear chat, and the required rep-verification safety note.
- Added rule-based ticket-aware mock responses for likely issue, next troubleshooting step, summary, draft reply, tone rewrite, product/model identification, missing-info checks, macro suggestions, and general support questions.
- Added Assist settings toggles for enabling Tessario Assist, ticket context, draft insertion, and required rep review before sending.
- Added the Tessario Knowledge Vault as a searchable mock workspace knowledge source for Tessario Assist.
- Added Tessario Knowledge Vault document categories, last updated date, owner/reviewer, Approved for AI, Internal only, Customer-facing allowed, and source status fields.
- Seeded the Tessario Knowledge Vault with 10 iSpring demo entries covering RCC7 tank pressure, RO500 reset/rinse, WGB32B pressure drop, warranty registration, replacement parts/review macro, tankless compatibility, water test rules, return policy, UVF55FS ballast/lamp, and WCS45KG startup/brine troubleshooting.
- Updated Tessario Assist to prefer Tessario Knowledge Vault content, cite the source used, show confidence/status, and warn when a source is outdated, unapproved, internal-only, or not customer-facing.
- Added mock admin controls for adding, editing owner/status, approving for AI, marking outdated, filtering, and archiving Tessario Knowledge Vault documents.

## Future Updates

- Add dated entries here whenever future Codex sessions make meaningful product, UI, data, or architecture changes.
