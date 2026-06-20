import { lastTicketActivityAt } from "./activity-analytics.mjs";

const maxQueueViewLimit = 500;
const queueViewIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const defaultPageLimit = 100;
const pendingStatuses = new Set([
  "closed, waiting on response",
  "waiting on response",
  "waiting customer",
  "waiting",
  "pending"
]);
const closedStatuses = new Set(["closed", "resolved"]);
const allowedTicketQueryKeys = new Set([
  "status",
  "assignee",
  "customerEmail",
  "priority",
  "createdAfter",
  "updatedAfter",
  "limit",
  "offset"
]);

export function queueViewsForState(value, settings = {}) {
  const defaults = defaultQueueViews(settings);
  if (!Array.isArray(value)) return defaults;
  const normalized = value
    .map((view) => normalizeQueueView(view))
    .filter(Boolean);
  return normalized.length ? normalized : defaults;
}

export function defaultQueueViews(settings = {}) {
  const views = [
    {
      id: "open",
      label: "Open",
      title: "Open Tickets",
      filters: { statusGroup: "open" }
    },
    {
      id: "assigned",
      label: "Assigned To Me",
      title: "Assigned To Me",
      filters: { statusGroup: "open", assignee: "current" }
    },
    {
      id: "closed",
      label: "Closed",
      title: "Closed Tickets",
      filters: { statusGroup: "closed-display" }
    }
  ];

  if (pendingSupported(settings)) {
    views.push({
      id: "pending",
      label: "Pending",
      title: "Pending Tickets",
      filters: { statusGroup: "pending" }
    });
  }

  return views;
}

export function findQueueView(views, id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;
  return views.find((view) => view.id === normalizedId) || null;
}

export function parseQueueTicketQuery(searchParams) {
  const unknown = [...searchParams.keys()].filter((key) => !allowedTicketQueryKeys.has(key));
  if (unknown.length) {
    return {
      ok: false,
      error: {
        error: "unsupported_queue_filter",
        message: "Queue ticket filter contains unsupported fields.",
        details: { fields: unknown }
      }
    };
  }

  const filters = {};
  for (const key of allowedTicketQueryKeys) {
    const value = searchParams.get(key);
    if (value !== null && value !== "") filters[key] = value;
  }

  const dateValidation = validateDateFilters(filters);
  if (!dateValidation.ok) return dateValidation;

  const limit = parseBoundedInteger(filters.limit, 1, maxQueueViewLimit, defaultPageLimit);
  if (!limit.ok) return invalidQueueFilter("limit", `limit must be an integer from 1 to ${maxQueueViewLimit}.`);
  const offset = parseBoundedInteger(filters.offset, 0, 100000, 0);
  if (!offset.ok) return invalidQueueFilter("offset", "offset must be an integer from 0 to 100000.");

  return {
    ok: true,
    value: {
      filters,
      limit: limit.value,
      offset: offset.value
    }
  };
}

export function filterTicketsForQueueView(tickets, view, context = {}, query = {}) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const baseFilters = view?.filters && typeof view.filters === "object" ? view.filters : {};
  const mergedFilters = { ...baseFilters, ...(query.filters || {}) };
  const currentUserName = stringValue(context.currentUserName);
  const filtered = safeTickets
    .filter((ticket) => matchesStatusGroup(ticket, mergedFilters.statusGroup))
    .filter((ticket) => matchesStatus(ticket, mergedFilters.status))
    .filter((ticket) => matchesAssignee(ticket, mergedFilters.assignee, currentUserName))
    .filter((ticket) => matchesCustomerEmail(ticket, mergedFilters.customerEmail))
    .filter((ticket) => matchesPriority(ticket, mergedFilters.priority))
    .filter((ticket) => matchesCreatedAfter(ticket, mergedFilters.createdAfter))
    .filter((ticket) => matchesUpdatedAfter(ticket, mergedFilters.updatedAfter))
    .sort(compareTicketsByRecentActivity);

  const offset = Number.isInteger(query.offset) ? query.offset : 0;
  const limit = Number.isInteger(query.limit) ? query.limit : defaultPageLimit;
  return {
    tickets: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset
  };
}

function normalizeQueueView(view) {
  if (!view || typeof view !== "object" || Array.isArray(view)) return null;
  const id = normalizeId(view.id);
  if (!id) return null;
  const label = cleanText(view.label, id);
  const title = cleanText(view.title, label);
  const filters = normalizeQueueFilters(view.filters);
  if (!filters) return null;
  return {
    id,
    label,
    title,
    filters
  };
}

function normalizeQueueFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return {};
  const normalized = {};
  if (["open", "closed", "pending", "closed-display"].includes(filters.statusGroup)) normalized.statusGroup = filters.statusGroup;
  if (filters.status) normalized.status = cleanText(filters.status, "");
  if (filters.assignee) normalized.assignee = cleanText(filters.assignee, "");
  if (filters.customerEmail) normalized.customerEmail = normalizeEmail(filters.customerEmail);
  if (filters.priority) normalized.priority = cleanText(filters.priority, "");
  if (validDate(filters.createdAfter)) normalized.createdAfter = validDate(filters.createdAfter).toISOString();
  if (validDate(filters.updatedAfter)) normalized.updatedAfter = validDate(filters.updatedAfter).toISOString();
  return normalized;
}

function pendingSupported(settings = {}) {
  return Array.isArray(settings.allowedStatuses)
    ? settings.allowedStatuses.some((status) => pendingStatuses.has(stringValue(status).toLowerCase()))
    : false;
}

function validateDateFilters(filters) {
  for (const key of ["createdAfter", "updatedAfter"]) {
    if (filters[key] && !validDate(filters[key])) {
      return invalidQueueFilter(key, `${key} must be a valid date.`);
    }
  }
  return { ok: true };
}

function invalidQueueFilter(field, message) {
  return {
    ok: false,
    error: {
      error: "invalid_queue_filter",
      message,
      details: { field }
    }
  };
}

function matchesStatusGroup(ticket, group) {
  if (!group) return true;
  const bucket = ticketStatusBucket(ticket);
  if (group === "open") return bucket === "open";
  if (group === "closed") return bucket === "closed";
  if (group === "pending") return bucket === "pending";
  if (group === "closed-display") return bucket === "closed" || bucket === "pending";
  return true;
}

function matchesStatus(ticket, status) {
  if (!status) return true;
  return rawStatus(ticket).toLowerCase() === stringValue(status).toLowerCase();
}

function matchesAssignee(ticket, assignee, currentUserName) {
  if (!assignee) return true;
  const expected = stringValue(assignee).toLowerCase() === "current" ? currentUserName : assignee;
  return normalizeName(ticket?.assignee) === normalizeName(expected);
}

function matchesCustomerEmail(ticket, email) {
  if (!email) return true;
  return normalizeEmail(ticket?.customer?.email || ticket?.customerEmail || ticket?.email || "") === normalizeEmail(email);
}

function matchesPriority(ticket, priority) {
  if (!priority) return true;
  return stringValue(ticket?.priority).toLowerCase() === stringValue(priority).toLowerCase();
}

function matchesCreatedAfter(ticket, value) {
  if (!value) return true;
  const ticketDate = validDate(ticket?.createdAt);
  const start = validDate(value);
  return Boolean(ticketDate && start && ticketDate >= start);
}

function matchesUpdatedAfter(ticket, value) {
  if (!value) return true;
  const ticketDate = validDate(lastTicketActivityAt(ticket));
  const start = validDate(value);
  return Boolean(ticketDate && start && ticketDate >= start);
}

function compareTicketsByRecentActivity(a, b) {
  const activityDiff = timestampValue(lastTicketActivityAt(b)) - timestampValue(lastTicketActivityAt(a));
  if (activityDiff) return activityDiff;
  const createdDiff = timestampValue(b?.createdAt) - timestampValue(a?.createdAt);
  if (createdDiff) return createdDiff;
  return stringValue(a?.id).localeCompare(stringValue(b?.id));
}

function ticketStatusBucket(ticket) {
  const raw = rawStatus(ticket).toLowerCase();
  if (closedStatuses.has(raw)) return "closed";
  if (pendingStatuses.has(raw)) return "pending";
  return "open";
}

function rawStatus(ticket) {
  return stringValue(ticket?.status || "Open");
}

function parseBoundedInteger(value, min, max, fallback) {
  if (value === undefined) return { ok: true, value: fallback };
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return { ok: false };
  return { ok: true, value: number };
}

function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timestampValue(value) {
  const date = validDate(value);
  return date ? date.getTime() : 0;
}

function normalizeId(value) {
  const id = stringValue(value).toLowerCase();
  return queueViewIdPattern.test(id) ? id : "";
}

function normalizeName(value) {
  return stringValue(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeEmail(value) {
  return stringValue(value).toLowerCase();
}

function cleanText(value, fallback) {
  const text = stringValue(value);
  return text ? text.slice(0, 120) : fallback;
}

function stringValue(value) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();
}
