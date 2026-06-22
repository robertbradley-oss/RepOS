import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile("app.js", "utf8");
const stylesSource = await readFile("styles.css", "utf8");
const helperSource = [
  "ticketMatchesVisibleQueue",
  "renderTicketRow",
  "mergeSelectedTickets",
  "isOpen"
].map((name) => extractFunction(appSource, name)).join("\n\n");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Could not locate ${name} in app.js.`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name} from app.js.`);
}

const now = Date.now();
const context = {
  filters: {
    global: "",
    queue: "",
    status: "All statuses",
    closedDateRange: "all"
  },
  activeView: "open",
  tickets: [
    ticket({
      id: "MERGE-PRIMARY",
      ticketNumber: "REP-1001",
      subject: "Primary pump issue",
      conversation: [
        message("customer", "Primary customer history", now - 4000)
      ],
      attachments: [
        { id: "primary-photo", fileName: "primary-photo.png", mimeType: "image/png" }
      ]
    }),
    ticket({
      id: "MERGE-SECONDARY",
      ticketNumber: "REP-1002",
      subject: "Secondary same customer",
      conversation: [
        message("customer", "Secondary customer detail", now - 3000),
        message("rep", "Secondary troubleshooting reply", now - 2000)
      ],
      attachments: [
        { id: "secondary-photo", fileName: "secondary-photo.png", mimeType: "image/png" },
        { name: "secondary-manual.pdf", mimeType: "application/pdf" }
      ]
    }),
    ticket({
      id: "MERGE-THIRD",
      ticketNumber: "REP-1003",
      subject: "Third duplicate thread",
      attachments: [
        { downloadUrl: "/uploads/third-unnamed", mimeType: "image/png" }
      ]
    }),
    ticket({
      id: "OLD-OPEN",
      ticketNumber: "REP-1004",
      subject: "Old open ticket without merge metadata",
      conversation: [
        message("customer", "Plain old ticket", now - 1000)
      ]
    })
  ],
  selectedTicketId: "",
  selectedTicketIds: new Set(["MERGE-PRIMARY", "MERGE-SECONDARY", "MERGE-THIRD"]),
  persistTicketCalls: 0,
  renderCalls: 0,
  toasts: [],
  ticketDisplayId(value) {
    return typeof value === "object" && value ? value.ticketNumber || value.id : String(value || "");
  },
  currentDemoUserName() {
    return "CS14 Robert";
  },
  addInternalNoteToTicket(targetTicket, body) {
    if (!body) return;
    targetTicket.conversation = Array.isArray(targetTicket.conversation) ? targetTicket.conversation : [];
    targetTicket.conversation.push({
      type: "note",
      author: "CS14 Robert",
      timestamp: new Date(now).toISOString(),
      body,
      internal: true
    });
  },
  persistTickets() {
    context.persistTicketCalls += 1;
  },
  render() {
    context.renderCalls += 1;
  },
  showToast(messageText) {
    context.toasts.push(messageText);
  },
  displayStatusFor(value) {
    const raw = String(typeof value === "object" && value ? value.status : value || "").trim();
    if (raw === "Closed" || raw === "Closed, Waiting On Response") return raw;
    return "Open";
  },
  ticketMatchesClosedDateRange() {
    return true;
  },
  ticketSearchText(targetTicket) {
    return [
      targetTicket.id,
      targetTicket.ticketNumber,
      targetTicket.subject,
      targetTicket.assignee,
      targetTicket.customer?.name,
      targetTicket.customer?.email,
      ...(Array.isArray(targetTicket.conversation) ? targetTicket.conversation.map((entry) => entry.body) : [])
    ].filter(Boolean).join(" ").toLowerCase();
  },
  ticketMatchesSearchQuery(haystack, query) {
    return haystack.includes(query);
  },
  isTicketActionLocked() {
    return false;
  },
  emailMessageCount(targetTicket) {
    return Array.isArray(targetTicket.conversation) ? targetTicket.conversation.filter((entry) => entry.type !== "timeline").length : 0;
  },
  emailCountLabel(targetTicket) {
    const count = context.emailMessageCount(targetTicket);
    return `${count} ${count === 1 ? "message" : "messages"}`;
  },
  isOverdue() {
    return false;
  },
  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
  lastUpdatedAt(targetTicket) {
    return targetTicket.updatedAt || targetTicket.createdAt || new Date(now).toISOString();
  },
  dateTimeLabel(value) {
    return String(value || "");
  },
  renderBadge(label, type) {
    return `<span class="badge ${type}">${context.escapeHtml(label)}</span>`;
  }
};

vm.createContext(context);
vm.runInContext(helperSource, context);

const [primary, secondary, third, oldOpen] = context.tickets;
context.mergeSelectedTickets(["MERGE-PRIMARY", "MERGE-SECONDARY", "MERGE-THIRD"], "MERGE-PRIMARY", "Keep customer context.");

assert.equal(context.selectedTicketId, primary.id, "merge should keep the primary ticket selected.");
assert.equal(context.persistTicketCalls, 1, "merge should persist tickets once.");
assert.equal(context.renderCalls, 1, "merge should render once.");
assert(context.toasts.some((toast) => toast.includes("Merged 3 tickets into REP-1001")), "merge should report the primary ticket identity.");

assert.equal(primary.id, "MERGE-PRIMARY", "primary ticket identity should be preserved.");
assert.equal(primary.merged, true, "primary ticket should be marked merged.");
assert.deepEqual(Array.from(primary.mergedFrom), ["REP-1002", "REP-1003"], "primary ticket should record merged source labels.");
assert.equal(secondary.mergedInto, primary.id, "secondary ticket should point to the primary merged ticket.");
assert.equal(third.mergedInto, primary.id, "third ticket should point to the primary merged ticket.");

assert(secondary.conversation.some((entry) => entry.body === "Secondary customer detail"), "secondary conversation should remain on the secondary ticket.");
assert(secondary.conversation.some((entry) => /merged this ticket into REP-1001/.test(entry.body || "")), "secondary ticket should keep a merge breadcrumb.");
assert(primary.conversation.some((entry) => entry.body === "Secondary customer detail" && entry.mergedFrom === "REP-1002"), "primary ticket should carry secondary customer messages with source metadata.");
assert(primary.conversation.some((entry) => entry.body === "Secondary troubleshooting reply" && entry.mergedFrom === "REP-1002"), "primary ticket should carry secondary rep messages with source metadata.");
assert(primary.conversation.some((entry) => entry.internal && entry.body === "Keep customer context."), "primary ticket should preserve the merge note.");

const attachmentKeys = primary.attachments.map((file) => file.id || file.fileName || file.name || file.downloadUrl);
assert(attachmentKeys.includes("primary-photo"), "primary attachment should remain.");
assert(attachmentKeys.includes("secondary-photo"), "secondary fileName attachment should be preserved on primary.");
assert(attachmentKeys.includes("secondary-manual.pdf"), "secondary name attachment should be preserved on primary.");
assert(attachmentKeys.includes("/uploads/third-unnamed"), "secondary downloadUrl attachment should be preserved on primary.");

const openMatcher = (targetTicket) => context.displayStatusFor(targetTicket) === "Open";
assert.equal(context.ticketMatchesVisibleQueue(primary, openMatcher), true, "primary merged ticket should remain visible in the open queue.");
assert.equal(context.ticketMatchesVisibleQueue(secondary, openMatcher), false, "merged-into secondary ticket should be hidden from visible queues.");
assert.equal(context.ticketMatchesVisibleQueue(third, openMatcher), false, "merged-into third ticket should be hidden from visible queues.");
assert.equal(context.ticketMatchesVisibleQueue(oldOpen, openMatcher), true, "old tickets without merge metadata should still filter normally.");

context.filters.global = "secondary";
assert.equal(context.ticketMatchesVisibleQueue(primary, openMatcher), true, "primary merged ticket should remain searchable by carried secondary thread text.");
assert.equal(context.ticketMatchesVisibleQueue(secondary, openMatcher), false, "merged-into ticket should stay hidden even when search matches it.");
context.filters.global = "";

assert.equal(context.isOpen(primary), true, "primary open merged ticket should still count as open.");
assert.equal(context.isOpen(secondary), false, "merged-into ticket should not count as open.");
assert.equal(context.isOpen(oldOpen), true, "old open ticket should still count as open.");
oldOpen.status = "Closed";
assert.equal(context.isOpen(oldOpen), false, "closed old ticket should not count as open.");
oldOpen.status = "Open";

const primaryRow = context.renderTicketRow(primary);
assert(primaryRow.includes('data-ticket-id="MERGE-PRIMARY"'), "primary row should render with the original ticket id.");
assert(primaryRow.includes("subject-merged-icon"), "primary merged ticket should render a merged indicator.");
assert(primaryRow.includes("Merged from REP-1002, REP-1003"), "merged indicator should expose source tickets.");

const oldRow = context.renderTicketRow(oldOpen);
assert(oldRow.includes('data-ticket-id="OLD-OPEN"'), "old ticket row should render normally.");
assert(!oldRow.includes("subject-merged-icon"), "old ticket without merge metadata should not render merged indicator.");

assert(stylesSource.includes(".subject-merged-icon"), "merged icon styles should be present.");
assert(/\.subject-merged-icon\s*\{[\s\S]*color:\s*var\(--accent-strong,\s*var\(--accent,\s*#6034e0\)\)/.test(stylesSource), "merged icon should use the existing accent color, not orange/yellow branding.");
assert(!/subject-unread|unread-dot|read-dot|blue-dot/i.test(stylesSource), "merge styling should not add unread/read blue-dot row indicators.");

console.log("Frontend merge workflow smoke test passed.");

function ticket(overrides = {}) {
  return {
    id: overrides.id || "TICKET",
    ticketNumber: overrides.ticketNumber || overrides.id || "TICKET",
    subject: overrides.subject || "Ticket",
    status: overrides.status || "Open",
    assignee: overrides.assignee || "CS14 Robert",
    customer: overrides.customer || { name: "Smoke Customer", email: "smoke@example.com" },
    createdAt: new Date(now - 5000).toISOString(),
    updatedAt: new Date(now - 1000).toISOString(),
    conversation: overrides.conversation,
    attachments: overrides.attachments || []
  };
}

function message(type, body, timestamp) {
  return {
    type,
    author: type === "rep" ? "CS14 Robert" : "Customer",
    timestamp: new Date(timestamp).toISOString(),
    body
  };
}
