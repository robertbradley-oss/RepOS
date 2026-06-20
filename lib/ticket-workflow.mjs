import { randomUUID } from "node:crypto";

export class ValidationError extends Error {
  constructor(error, message, details = {}, status = 400) {
    super(message || error);
    this.name = "ValidationError";
    this.error = error;
    this.details = details;
    this.status = status;
  }
}

const maxTextLength = 20000;
const maxShortTextLength = 500;
const supportedTicketStatuses = new Set(["Open", "Closed, Waiting On Response", "Closed"]);
const statusAliases = new Map([
  ["open", "Open"],
  ["assigned", "Open"],
  ["pending", "Closed, Waiting On Response"],
  ["waiting", "Closed, Waiting On Response"],
  ["waiting customer", "Closed, Waiting On Response"],
  ["waiting on response", "Closed, Waiting On Response"],
  ["closed, waiting on response", "Closed, Waiting On Response"],
  ["closed", "Closed"],
  ["resolved", "Closed"]
]);

const patchFields = new Set([
  "status",
  "assignee",
  "subject",
  "priority",
  "customer",
  "model",
  "family",
  "source",
  "purchaseSource",
  "purchaseSourceMode",
  "order",
  "warranty",
  "receipt",
  "receiptReviewStatus",
  "warrantyReviewStatus",
  "missing",
  "tags",
  "attachments",
  "draft",
  "dueAt",
  "lastCustomerAt",
  "lastRepAt",
  "partsSent",
  "escalated"
]);

export function actorName(user) {
  return cleanShortText(user?.displayName || user?.repName || user?.email || user || "System", "actor");
}

export function normalizeTicketStatus(value, { required = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) throw new ValidationError("invalid_ticket_status", "Ticket status is required.", { field: "status" });
    return "";
  }
  const normalized = statusAliases.get(raw.toLowerCase()) || raw;
  if (!supportedTicketStatuses.has(normalized)) {
    throw new ValidationError("invalid_ticket_status", "Ticket status is not supported.", {
      field: "status",
      supported: [...supportedTicketStatuses],
      aliases: ["Assigned", "Pending", "Resolved"]
    });
  }
  return normalized;
}

export function buildTicketCreate(input, context = {}) {
  if (!isPlainObject(input)) {
    throw new ValidationError("invalid_ticket_payload", "Ticket payload must be an object.");
  }
  const now = new Date().toISOString();
  const subject = cleanShortText(input.subject, "subject", { required: true });
  const status = normalizeTicketStatus(input.status || "Open");
  const customer = validateCustomerFields(input.customer || {}, { requireContact: true });
  const ticket = {
    ...input,
    id: cleanId(input.id || input.ticketNumber || randomUUID(), "id"),
    subject,
    customer,
    status,
    assignee: cleanShortText(input.assignee || actorName(context.actor), "assignee"),
    createdAt: validDateString(input.createdAt, "createdAt") || now,
    updatedAt: validDateString(input.updatedAt, "updatedAt") || now,
    conversation: Array.isArray(input.conversation) ? input.conversation.map(validateExistingMessage) : []
  };
  return ticket;
}

export function applyTicketPatch(current, patch, context = {}) {
  if (!isPlainObject(patch)) {
    throw new ValidationError("invalid_ticket_patch", "Ticket patch must be an object.");
  }
  const unknown = Object.keys(patch).filter((key) => !patchFields.has(key));
  if (unknown.length) {
    throw new ValidationError("unsupported_ticket_patch_fields", "Ticket patch contains unsupported fields.", { fields: unknown });
  }

  const actor = actorName(context.actor);
  const now = new Date().toISOString();
  const next = { ...current, id: current.id };
  const activities = [];

  if (Object.hasOwn(patch, "status")) {
    const previousStatus = normalizeTicketStatus(current.status || "Open") || "Open";
    const nextStatus = normalizeTicketStatus(patch.status, { required: true });
    next.status = nextStatus;
    if (previousStatus !== nextStatus) {
      activities.push(statusActivity(previousStatus, nextStatus, actor, now));
    }
  }

  if (Object.hasOwn(patch, "assignee")) {
    const previousAssignee = cleanShortText(current.assignee || "Unassigned", "assignee");
    const nextAssignee = cleanShortText(patch.assignee || "Unassigned", "assignee");
    next.assignee = nextAssignee === "Unassigned" ? "" : nextAssignee;
    if (previousAssignee !== nextAssignee) {
      activities.push(timeline(actor, now, `${actor} reassigned this ticket from ${previousAssignee} to ${nextAssignee}.`));
    }
  }

  for (const [field, value] of Object.entries(patch)) {
    if (field === "status" || field === "assignee") continue;
    next[field] = validatePatchField(field, value);
  }

  next.conversation = [
    ...(Array.isArray(current.conversation) ? current.conversation : []),
    ...activities
  ];
  next.updatedAt = now;
  return next;
}

export function buildTicketMessage(input, context = {}) {
  if (!isPlainObject(input)) {
    throw new ValidationError("invalid_message_payload", "Message payload must be an object.");
  }
  const type = normalizeMessageType(input.type || context.type || "note");
  const body = cleanLongText(input.body, "body", { required: true });
  const timestamp = validDateString(input.timestamp, "timestamp") || new Date().toISOString();
  const author = cleanShortText(input.author || actorName(context.actor), "author");
  const message = {
    ...input,
    id: cleanId(input.id || randomUUID(), "id"),
    type,
    author,
    timestamp,
    body,
    internal: type === "note" ? true : input.internal === true
  };
  if (type !== "note") delete message.internal;
  return message;
}

export function messageActivity(message, actor = "System") {
  const author = actorName(actor);
  if (message.type === "note") return timeline(author, message.timestamp, `${author} added an internal note.`);
  if (message.type === "customer") return timeline(author, message.timestamp, `Customer reply added by ${author}.`);
  return timeline(author, message.timestamp, `${author} added a customer-facing reply.`);
}

export function buildTicketAttachment(input, context = {}) {
  if (!isPlainObject(input)) {
    throw new ValidationError("invalid_attachment_payload", "Attachment metadata must be an object.");
  }
  const now = new Date().toISOString();
  const fileName = cleanShortText(input.fileName || input.file || input.name, "fileName", { required: true });
  const attachment = {
    ...input,
    id: cleanId(input.id || randomUUID(), "id"),
    fileName,
    file: fileName,
    type: cleanShortText(input.type || "attachment", "type"),
    mimeType: cleanShortText(input.mimeType || "", "mimeType", { allowEmpty: true }),
    sizeBytes: normalizeNonNegativeNumber(input.sizeBytes ?? input.size, "sizeBytes"),
    uploadedBy: cleanShortText(input.uploadedBy || actorName(context.actor), "uploadedBy"),
    uploadedAt: validDateString(input.uploadedAt || input.timestamp, "uploadedAt") || now,
    status: cleanShortText(input.status || "Attached", "status")
  };
  return attachment;
}

export function attachmentActivity(attachment, actor = "System") {
  const author = actorName(actor);
  return timeline(author, attachment.uploadedAt, `${author} added attachment ${attachment.fileName}.`);
}

function statusActivity(previousStatus, nextStatus, actor, timestamp) {
  if (!isClosedStatus(previousStatus) && isClosedStatus(nextStatus)) {
    return timeline(actor, timestamp, `${actor} closed this ticket.`);
  }
  if (isClosedStatus(previousStatus) && !isClosedStatus(nextStatus)) {
    return timeline(actor, timestamp, `${actor} reopened this ticket.`);
  }
  return timeline(actor, timestamp, `${actor} changed status from ${previousStatus} to ${nextStatus}.`);
}

function timeline(author, timestamp, body) {
  return {
    id: randomUUID(),
    type: "timeline",
    author,
    timestamp,
    body
  };
}

function isClosedStatus(status) {
  return status === "Closed" || status === "Closed, Waiting On Response";
}

function validatePatchField(field, value) {
  if (field === "subject") return cleanShortText(value, field, { required: true });
  if (field === "customer") return validateCustomerFields(value);
  if (["model", "family", "source", "purchaseSource", "purchaseSourceMode", "priority", "order", "warranty", "receiptReviewStatus", "warrantyReviewStatus", "draft"].includes(field)) {
    return cleanLongText(value, field, { allowEmpty: true });
  }
  if (["dueAt", "lastCustomerAt", "lastRepAt"].includes(field)) {
    return value ? validDateString(value, field, { required: true }) : "";
  }
  if (["receipt", "partsSent", "escalated"].includes(field)) return Boolean(value);
  if (["missing", "tags"].includes(field)) return validateStringArray(value, field);
  if (field === "attachments") return validateAttachmentList(value);
  return value;
}

function validateCustomerFields(value, { requireContact = false } = {}) {
  if (!isPlainObject(value)) {
    throw new ValidationError("invalid_customer_fields", "Customer fields must be an object.", { field: "customer" });
  }
  const customer = {
    ...value,
    name: cleanShortText(value.name || "", "customer.name", { allowEmpty: !requireContact }),
    email: cleanEmail(value.email || "", { required: requireContact }),
    phone: cleanShortText(value.phone || "", "customer.phone", { allowEmpty: true }),
    mobile: cleanShortText(value.mobile || "", "customer.mobile", { allowEmpty: true }),
    address: cleanLongText(value.address || "", "customer.address", { allowEmpty: true }),
    notes: cleanLongText(value.notes || "", "customer.notes", { allowEmpty: true })
  };
  if (requireContact && !customer.name && !customer.email) {
    throw new ValidationError("invalid_customer_fields", "Customer name or email is required.", { field: "customer" });
  }
  return customer;
}

function validateExistingMessage(value) {
  if (!isPlainObject(value)) return buildTicketMessage({ body: String(value || ""), type: "note" });
  if (value.type === "timeline") {
    return {
      ...value,
      id: value.id || randomUUID(),
      type: "timeline",
      author: cleanShortText(value.author || "System", "author"),
      timestamp: validDateString(value.timestamp, "timestamp") || new Date().toISOString(),
      body: cleanLongText(value.body || "", "body", { allowEmpty: true })
    };
  }
  return buildTicketMessage(value);
}

function normalizeMessageType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (["note", "rep", "customer"].includes(type)) return type;
  if (["reply", "message"].includes(type)) return "rep";
  throw new ValidationError("invalid_message_type", "Message type is not supported.", { field: "type", supported: ["note", "rep", "customer"] });
}

function validateStringArray(value, field) {
  if (!Array.isArray(value)) throw new ValidationError("invalid_ticket_field", `${field} must be an array.`, { field });
  return value.map((item) => cleanShortText(item, field)).filter(Boolean);
}

function validateAttachmentList(value) {
  if (!Array.isArray(value)) throw new ValidationError("invalid_ticket_field", "attachments must be an array.", { field: "attachments" });
  return value.map((item) => buildTicketAttachment(item));
}

function cleanId(value, field) {
  const text = cleanShortText(value, field, { required: true });
  if (!/^[A-Za-z0-9._:#-]+$/.test(text)) {
    throw new ValidationError("invalid_identifier", `${field} contains unsupported characters.`, { field });
  }
  return text;
}

function cleanEmail(value, { required = false } = {}) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) {
    if (required) throw new ValidationError("invalid_email", "Customer email is required.", { field: "customer.email" });
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > maxShortTextLength) {
    throw new ValidationError("invalid_email", "Customer email is invalid.", { field: "customer.email" });
  }
  return email;
}

function cleanShortText(value, field, options = {}) {
  return cleanText(value, field, maxShortTextLength, options);
}

function cleanLongText(value, field, options = {}) {
  return cleanText(value, field, maxTextLength, options);
}

function cleanText(value, field, limit, { required = false, allowEmpty = false } = {}) {
  const text = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!text && required) throw new ValidationError("missing_required_field", `${field} is required.`, { field });
  if (!text && !allowEmpty && required) throw new ValidationError("missing_required_field", `${field} is required.`, { field });
  if (text.length > limit) throw new ValidationError("field_too_long", `${field} is too long.`, { field, maxLength: limit });
  return text;
}

function normalizeNonNegativeNumber(value, field) {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new ValidationError("invalid_number", `${field} must be a non-negative number.`, { field });
  }
  return Math.round(number);
}

function validDateString(value, field, { required = false } = {}) {
  if (!value) {
    if (required) throw new ValidationError("invalid_date", `${field} must be a valid date.`, { field });
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("invalid_date", `${field} must be a valid date.`, { field });
  }
  return date.toISOString();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
