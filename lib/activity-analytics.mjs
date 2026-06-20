const defaultWindowHours = 24;
const maxRecentActivityLimit = 100;
const closedStatuses = new Set(["closed", "resolved"]);
const pendingStatuses = new Set([
  "closed, waiting on response",
  "waiting on response",
  "waiting customer",
  "waiting",
  "pending"
]);

export function buildAnalyticsSummary({
  tickets = [],
  settings = {},
  user = null,
  now = new Date(),
  windowHours = defaultWindowHours,
  recentActivityLimit = 20
} = {}) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const generatedAt = validDate(now)?.toISOString() || new Date().toISOString();
  const windowStart = new Date(new Date(generatedAt).getTime() - normalizeWindowHours(windowHours) * 60 * 60 * 1000);
  const currentUserName = currentAssignmentName(user, settings);
  const events = safeTickets.flatMap((ticket) => ticketActivityEvents(ticket));
  const recentEvents = events
    .filter((event) => isAtOrAfter(event.timestamp, windowStart))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentlyUpdatedTickets = safeTickets.filter((ticket) => isAtOrAfter(lastTicketActivityAt(ticket), windowStart));
  const statusCounts = statusCountMap(safeTickets);
  const pendingStatusSupported = supportsPendingStatus(settings, safeTickets);

  return {
    generatedAt,
    windowHours: normalizeWindowHours(windowHours),
    context: {
      workspaceName: stringValue(settings.workspaceName || "iSpring Water Systems"),
      currentUserName,
      currentUserEmail: stringValue(user?.email || ""),
      currentUserRole: stringValue(user?.role || settings.currentUserRole || "")
    },
    metrics: {
      totalTicketCount: safeTickets.length,
      openTicketCount: safeTickets.filter((ticket) => ticketStatusBucket(ticket) === "open").length,
      assignedToCurrentUserCount: safeTickets.filter((ticket) => isAssignedTo(ticket, currentUserName) && ticketStatusBucket(ticket) === "open").length,
      allAssignedToCurrentUserCount: safeTickets.filter((ticket) => isAssignedTo(ticket, currentUserName)).length,
      closedTicketCount: safeTickets.filter((ticket) => ticketStatusBucket(ticket) === "closed").length,
      pendingTicketCount: pendingStatusSupported ? safeTickets.filter((ticket) => ticketStatusBucket(ticket) === "pending").length : 0,
      recentReplyCount: recentEvents.filter((event) => event.category === "reply").length,
      recentNoteCount: recentEvents.filter((event) => event.category === "note").length,
      recentActivityCount: recentEvents.length,
      ticketsUpdatedRecentlyCount: recentlyUpdatedTickets.length
    },
    statusCounts,
    activity: {
      countsByCategory: categoryCountMap(recentEvents),
      recent: recentEvents.slice(0, normalizeRecentActivityLimit(recentActivityLimit))
    }
  };
}

export function ticketActivityEvents(ticket = {}) {
  const ticketId = stringValue(ticket.id);
  const subject = stringValue(ticket.subject);
  const conversationEvents = Array.isArray(ticket.conversation)
    ? ticket.conversation
      .map((message) => eventFromMessage(ticket, message))
      .filter(Boolean)
    : [];
  const attachmentEvents = Array.isArray(ticket.attachments)
    ? ticket.attachments
      .map((attachment) => eventFromAttachment(ticket, attachment, conversationEvents))
      .filter(Boolean)
    : [];

  return [...conversationEvents, ...attachmentEvents]
    .filter((event) => event.timestamp)
    .map((event) => ({
      ticketId,
      ticketDisplayId: ticketDisplayId(ticketId),
      ticketSubject: subject,
      ...event
    }));
}

export function lastTicketActivityAt(ticket = {}) {
  const dates = [
    ticket.updatedAt,
    ticket.createdAt,
    ...(Array.isArray(ticket.conversation) ? ticket.conversation.map((message) => message?.timestamp || message?.createdAt) : []),
    ...(Array.isArray(ticket.attachments) ? ticket.attachments.map((attachment) => attachment?.uploadedAt || attachment?.timestamp || attachment?.createdAt) : [])
  ].map(validDate).filter(Boolean);
  if (!dates.length) return "";
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function eventFromMessage(ticket, message) {
  if (!message || typeof message !== "object") return null;
  const timestamp = validDate(message.timestamp || message.createdAt)?.toISOString();
  if (!timestamp) return null;
  const type = stringValue(message.type || "activity").toLowerCase();
  const body = stringValue(message.body);
  return {
    id: stringValue(message.id),
    category: messageCategory(type, body),
    type,
    author: stringValue(message.author || message.rep || "System"),
    timestamp,
    body: truncate(body, 280),
    source: "conversation"
  };
}

function eventFromAttachment(ticket, attachment, conversationEvents) {
  if (!attachment || typeof attachment !== "object") return null;
  const timestamp = validDate(attachment.uploadedAt || attachment.timestamp || attachment.createdAt)?.toISOString();
  if (!timestamp) return null;
  const fileName = stringValue(attachment.fileName || attachment.file || attachment.name);
  if (!fileName || hasMatchingAttachmentTimeline(fileName, timestamp, conversationEvents)) return null;
  return {
    id: stringValue(attachment.id),
    category: "attachment",
    type: "attachment",
    author: stringValue(attachment.uploadedBy || "System"),
    timestamp,
    body: truncate(`Attachment added: ${fileName}.`, 280),
    source: "attachments"
  };
}

function messageCategory(type, body) {
  if (type === "note") return "note";
  if (type === "rep" || type === "customer") return "reply";
  const text = body.toLowerCase();
  if (/status changed|changed status|closed this ticket|reopened this ticket|resolved|waiting on response|waiting customer|pending/.test(text)) return "status";
  if (/reassigned|assigned to|assigned this ticket/.test(text) && !/detected possible purchase source/.test(text)) return "assignment";
  if (/attachment|uploaded file|file added/.test(text)) return "attachment";
  return "activity";
}

function hasMatchingAttachmentTimeline(fileName, timestamp, conversationEvents) {
  const attachmentTime = new Date(timestamp).getTime();
  const normalizedName = fileName.toLowerCase();
  return conversationEvents.some((event) => {
    if (event.category !== "attachment" || !event.body.toLowerCase().includes(normalizedName)) return false;
    return Math.abs(new Date(event.timestamp).getTime() - attachmentTime) <= 5 * 60 * 1000;
  });
}

function ticketStatusBucket(ticket) {
  const raw = rawStatus(ticket).toLowerCase();
  if (closedStatuses.has(raw)) return "closed";
  if (pendingStatuses.has(raw)) return "pending";
  return "open";
}

function statusCountMap(tickets) {
  return tickets.reduce((counts, ticket) => {
    const bucket = ticketStatusBucket(ticket);
    counts[bucket] = (counts[bucket] || 0) + 1;
    return counts;
  }, { open: 0, pending: 0, closed: 0 });
}

function categoryCountMap(events) {
  return events.reduce((counts, event) => {
    counts[event.category] = (counts[event.category] || 0) + 1;
    return counts;
  }, {});
}

function supportsPendingStatus(settings, tickets) {
  const configured = Array.isArray(settings.allowedStatuses)
    ? settings.allowedStatuses.some((status) => pendingStatuses.has(stringValue(status).toLowerCase()))
    : false;
  return configured || tickets.some((ticket) => ticketStatusBucket(ticket) === "pending");
}

function currentAssignmentName(user, settings) {
  return stringValue(user?.repName || user?.displayName || settings.currentUserName || settings.defaultAssignee || "");
}

function isAssignedTo(ticket, currentUserName) {
  if (!currentUserName) return false;
  return normalizeName(ticket?.assignee) === normalizeName(currentUserName);
}

function rawStatus(ticket) {
  const value = ticket && typeof ticket === "object" ? ticket.status : ticket;
  return stringValue(value || "Open");
}

function isAtOrAfter(value, start) {
  const date = validDate(value);
  return Boolean(date && date >= start);
}

function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeWindowHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return defaultWindowHours;
  return Math.max(1, Math.min(24 * 30, Math.round(number)));
}

function normalizeRecentActivityLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 20;
  return Math.max(1, Math.min(maxRecentActivityLimit, Math.round(number)));
}

function normalizeName(value) {
  return stringValue(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function stringValue(value) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();
}

function truncate(value, maxLength) {
  const text = stringValue(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function ticketDisplayId(id) {
  const value = stringValue(id);
  return value && /^ISP-/i.test(value) ? value : value ? `ISP-${value}` : "";
}
