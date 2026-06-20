const defaultSlaHours = 48;
const defaultOverdueGraceHours = 0;
const maxSlaHours = 24 * 30;
const maxGraceHours = 24 * 7;
const closedStatuses = new Set(["closed", "resolved"]);
const allowedSlaFilters = new Set(["overdue", "due-soon", "on-track", "closed", "no-due-date"]);

export function normalizeSlaSettings(settings = {}) {
  return {
    defaultSlaHours: boundedWholeNumber(settings.defaultSlaHours, defaultSlaHours, 1, maxSlaHours),
    overdueGraceHours: boundedWholeNumber(settings.overdueGraceHours, defaultOverdueGraceHours, 0, maxGraceHours)
  };
}

export function deriveTicketSla(ticket = {}, settings = {}, options = {}) {
  const now = validDate(options.now) || new Date();
  const normalizedSettings = normalizeSlaSettings(settings);
  const explicitDueAt = explicitDueDate(ticket);
  const derivedDueAt = explicitDueAt || derivedDueDate(ticket, normalizedSettings.defaultSlaHours);
  const dueAt = derivedDueAt?.toISOString() || "";
  const closed = isClosedTicket(ticket);

  if (!dueAt) {
    return {
      dueAt: "",
      isOverdue: false,
      isDueSoon: false,
      overdueByHours: 0,
      dueLabel: closed ? "Closed" : "No due date",
      slaStatus: closed ? "closed" : "no-due-date"
    };
  }

  if (closed) {
    return {
      dueAt,
      isOverdue: false,
      isDueSoon: false,
      overdueByHours: 0,
      dueLabel: "Closed",
      slaStatus: "closed"
    };
  }

  const dueDate = new Date(dueAt);
  const graceMs = normalizedSettings.overdueGraceHours * 60 * 60 * 1000;
  const overdueMs = now.getTime() - dueDate.getTime() - graceMs;
  const isOverdue = overdueMs > 0;
  const overdueByHours = isOverdue ? Math.max(1, Math.ceil(overdueMs / (60 * 60 * 1000))) : 0;
  const dueSoonWindowHours = Math.max(1, Math.min(24, normalizedSettings.defaultSlaHours));
  const dueInMs = dueDate.getTime() - now.getTime();
  const isDueSoon = !isOverdue && dueInMs <= dueSoonWindowHours * 60 * 60 * 1000;
  const dueLabel = isOverdue
    ? `Overdue by ${formatHours(overdueByHours)}`
    : dueInMs <= 0
      ? "Due now"
      : `Due in ${formatHours(Math.max(1, Math.ceil(dueInMs / (60 * 60 * 1000))))}`;

  return {
    dueAt,
    isOverdue,
    isDueSoon,
    overdueByHours,
    dueLabel,
    slaStatus: isOverdue ? "overdue" : isDueSoon ? "due-soon" : "on-track"
  };
}

export function withTicketSla(ticket, settings = {}, options = {}) {
  if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) return ticket;
  return {
    ...ticket,
    ...deriveTicketSla(ticket, settings, options)
  };
}

export function withTicketsSla(tickets, settings = {}, options = {}) {
  return Array.isArray(tickets)
    ? tickets.map((ticket) => withTicketSla(ticket, settings, options))
    : [];
}

export function slaStatusCounts(tickets, settings = {}, options = {}) {
  const counts = { overdue: 0, dueSoon: 0 };
  for (const ticket of Array.isArray(tickets) ? tickets : []) {
    const sla = deriveTicketSla(ticket, settings, options);
    if (sla.isOverdue) counts.overdue += 1;
    if (sla.isDueSoon) counts.dueSoon += 1;
  }
  return counts;
}

export function normalizeSlaFilter(value) {
  const normalized = stringValue(value).toLowerCase();
  return allowedSlaFilters.has(normalized) ? normalized : "";
}

export function matchesTicketSlaFilter(ticket, value, settings = {}, options = {}) {
  const filter = normalizeSlaFilter(value);
  if (!filter) return true;
  return deriveTicketSla(ticket, settings, options).slaStatus === filter;
}

export function isValidSlaFilter(value) {
  return Boolean(normalizeSlaFilter(value));
}

function explicitDueDate(ticket) {
  for (const key of ["dueAt", "deadline", "slaDueAt", "responseDueAt"]) {
    const date = validDate(ticket?.[key]);
    if (date) return date;
  }
  return null;
}

function derivedDueDate(ticket, defaultHours) {
  const basis = validDate(ticket?.createdAt)
    || validDate(ticket?.updatedAt)
    || latestConversationDate(ticket)
    || latestAttachmentDate(ticket);
  return basis ? new Date(basis.getTime() + defaultHours * 60 * 60 * 1000) : null;
}

function latestConversationDate(ticket) {
  const dates = Array.isArray(ticket?.conversation)
    ? ticket.conversation.map((message) => validDate(message?.timestamp || message?.createdAt)).filter(Boolean)
    : [];
  return latestDate(dates);
}

function latestAttachmentDate(ticket) {
  const dates = Array.isArray(ticket?.attachments)
    ? ticket.attachments.map((attachment) => validDate(attachment?.uploadedAt || attachment?.timestamp || attachment?.createdAt)).filter(Boolean)
    : [];
  return latestDate(dates);
}

function latestDate(dates) {
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

function isClosedTicket(ticket) {
  return closedStatuses.has(stringValue(ticket?.status || "Open").toLowerCase());
}

function boundedWholeNumber(value, fallback, min, max) {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHours(hours) {
  return `${hours}h`;
}

function stringValue(value) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();
}
