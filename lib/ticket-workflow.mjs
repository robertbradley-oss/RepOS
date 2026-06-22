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

export function mergeTicketsInCollection(tickets, primaryTicketId, input, context = {}) {
  if (!Array.isArray(tickets)) {
    throw new ValidationError("invalid_ticket_collection", "Ticket collection must be an array.");
  }
  const payload = normalizeMergePayload(input);
  const primaryId = cleanId(primaryTicketId, "id");
  if (payload.secondaryTicketIds.includes(primaryId)) {
    throw new ValidationError("cannot_merge_ticket_into_itself", "A ticket cannot be merged into itself.", { field: "secondaryTicketIds" });
  }

  const indexes = new Map(tickets.map((ticket, index) => [String(ticket?.id), index]));
  const primaryIndex = indexes.get(primaryId);
  if (primaryIndex === undefined) {
    throw new ValidationError("ticket_not_found", "Primary ticket was not found.", { id: primaryId }, 404);
  }

  const missingSecondaryIds = payload.secondaryTicketIds.filter((id) => !indexes.has(id));
  if (missingSecondaryIds.length) {
    throw new ValidationError("secondary_ticket_not_found", "One or more secondary tickets were not found.", { ids: missingSecondaryIds }, 404);
  }

  const primary = tickets[primaryIndex];
  const secondaries = payload.secondaryTicketIds.map((id) => tickets[indexes.get(id)]);
  validateMergeTargets(primary, secondaries, primaryId);

  const now = new Date().toISOString();
  const actor = actorName(context.actor);
  const secondaryLabels = secondaries.map((ticket) => ticketDisplayId(ticket));
  const primaryLabel = ticketDisplayId(primary);
  const primaryConversation = Array.isArray(primary.conversation) ? [...primary.conversation] : [];
  const primaryAttachments = Array.isArray(primary.attachments) ? [...primary.attachments] : [];
  const attachmentKeys = new Set(primaryAttachments.map(attachmentIdentity).filter(Boolean));

  for (const secondary of secondaries) {
    const sourceLabel = ticketDisplayId(secondary);
    const sourceConversation = Array.isArray(secondary.conversation) ? secondary.conversation : [];
    for (const message of sourceConversation) {
      primaryConversation.push({
        ...message,
        mergedFrom: message?.mergedFrom || sourceLabel,
        sourceTicketId: message?.sourceTicketId || String(secondary.id)
      });
    }

    const sourceAttachments = Array.isArray(secondary.attachments) ? secondary.attachments : [];
    for (const attachment of sourceAttachments) {
      const key = attachmentIdentity(attachment);
      if (key && attachmentKeys.has(key)) continue;
      primaryAttachments.push({
        ...attachment,
        mergedFrom: attachment?.mergedFrom || sourceLabel,
        sourceTicketId: attachment?.sourceTicketId || String(secondary.id)
      });
      if (key) attachmentKeys.add(key);
    }
  }

  primaryConversation.sort((a, b) => timestampValue(a?.timestamp || a?.createdAt) - timestampValue(b?.timestamp || b?.createdAt));
  const primaryMergeEvent = timeline(actor, now, `${actor} merged ${secondaryLabels.join(", ")} into this ticket.`);
  primaryMergeEvent.merge = {
    type: "primary",
    secondaryTicketIds: payload.secondaryTicketIds
  };
  primaryConversation.push(primaryMergeEvent);
  if (payload.note) {
    primaryConversation.push({
      id: randomUUID(),
      type: "note",
      author: actor,
      timestamp: now,
      body: payload.note,
      internal: true,
      mergeNote: true
    });
  }

  const primaryTicket = {
    ...primary,
    merged: true,
    mergedFrom: uniqueStrings([...(Array.isArray(primary.mergedFrom) ? primary.mergedFrom : []), ...payload.secondaryTicketIds]),
    updatedAt: now,
    conversation: primaryConversation,
    attachments: primaryAttachments
  };

  const secondaryTickets = secondaries.map((ticket) => {
    const secondaryEvent = timeline(actor, now, `${actor} merged this ticket into ${primaryLabel}.`);
    secondaryEvent.merge = {
      type: "secondary",
      primaryTicketId: primaryId
    };
    return {
      ...ticket,
      mergedInto: primaryId,
      mergedAt: now,
      mergedBy: actor,
      ...(payload.closeSecondary ? { status: "Closed" } : {}),
      updatedAt: now,
      conversation: [...(Array.isArray(ticket.conversation) ? ticket.conversation : []), secondaryEvent]
    };
  });

  const nextTickets = [...tickets];
  nextTickets[primaryIndex] = primaryTicket;
  secondaryTickets.forEach((ticket, index) => {
    nextTickets[indexes.get(payload.secondaryTicketIds[index])] = ticket;
  });

  return {
    tickets: nextTickets,
    updatedTickets: [primaryTicket, ...secondaryTickets],
    ticket: primaryTicket,
    merged: secondaryTickets.map((ticket) => ({
      id: String(ticket.id),
      mergedInto: primaryId,
      mergedAt: ticket.mergedAt,
      mergedBy: ticket.mergedBy
    })),
    audit: [
      {
        ticketId: primaryId,
        type: "merge",
        body: primaryMergeEvent.body,
        timestamp: now,
        author: actor
      },
      ...secondaryTickets.map((ticket) => ({
        ticketId: String(ticket.id),
        type: "merge",
        body: `${actor} merged this ticket into ${primaryLabel}.`,
        timestamp: now,
        author: actor
      }))
    ]
  };
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

function normalizeMergePayload(input) {
  if (!isPlainObject(input)) {
    throw new ValidationError("invalid_merge_payload", "Merge payload must be an object.");
  }
  if (!Array.isArray(input.secondaryTicketIds) || !input.secondaryTicketIds.length) {
    throw new ValidationError("invalid_merge_payload", "secondaryTicketIds must contain at least one ticket ID.", { field: "secondaryTicketIds" });
  }
  const secondaryTicketIds = input.secondaryTicketIds.map((id) => cleanId(id, "secondaryTicketIds"));
  const duplicateIds = duplicateStrings(secondaryTicketIds);
  if (duplicateIds.length) {
    throw new ValidationError("invalid_merge_payload", "secondaryTicketIds must not contain duplicate ticket IDs.", {
      field: "secondaryTicketIds",
      duplicateIds
    });
  }
  const note = cleanLongText(input.note || input.reason || "", "note", { allowEmpty: true });
  if (Object.hasOwn(input, "closeSecondary") && typeof input.closeSecondary !== "boolean") {
    throw new ValidationError("invalid_merge_payload", "closeSecondary must be a boolean when provided.", { field: "closeSecondary" });
  }
  return { secondaryTicketIds, note, closeSecondary: input.closeSecondary === true };
}

function validateMergeTargets(primary, secondaries, primaryId) {
  const targetTickets = [primary, ...secondaries];
  const mergedIntoTickets = targetTickets.filter((ticket) => ticket?.mergedInto);
  if (mergedIntoTickets.length) {
    throw new ValidationError("ticket_already_merged", "Merged-into tickets cannot be merged again.", {
      ids: mergedIntoTickets.map((ticket) => String(ticket.id))
    }, 409);
  }

  const mergedSecondaries = secondaries.filter((ticket) => ticket?.merged === true || (Array.isArray(ticket?.mergedFrom) && ticket.mergedFrom.length));
  if (mergedSecondaries.length) {
    throw new ValidationError("ticket_already_merged", "Already-merged secondary tickets cannot be merged again.", {
      ids: mergedSecondaries.map((ticket) => String(ticket.id))
    }, 409);
  }

  const closedTickets = targetTickets.filter((ticket) => isClosedStatus(normalizeTicketStatus(ticket?.status || "Open")));
  if (closedTickets.length) {
    throw new ValidationError("unsafe_ticket_status", "Closed tickets cannot be merged safely.", {
      ids: closedTickets.map((ticket) => String(ticket.id))
    }, 409);
  }

  const cycleTickets = secondaries.filter((ticket) => createsMergeCycle(ticket, primaryId));
  if (cycleTickets.length) {
    throw new ValidationError("merge_cycle_detected", "Ticket merge would create a cycle.", {
      ids: cycleTickets.map((ticket) => String(ticket.id))
    }, 409);
  }

  const identities = targetTickets.map(customerIdentity).filter(Boolean);
  if (new Set(identities).size > 1) {
    throw new ValidationError("customer_mismatch", "Tickets from different customers cannot be merged.", {
      customerIdentities: uniqueStrings(identities)
    }, 409);
  }
}

function createsMergeCycle(ticket, primaryId) {
  if (String(ticket?.mergedInto || "") === primaryId) return true;
  const mergedFrom = Array.isArray(ticket?.mergedFrom) ? ticket.mergedFrom.map(String) : [];
  return mergedFrom.includes(primaryId);
}

function customerIdentity(ticket) {
  const email = String(ticket?.customer?.email || ticket?.customerEmail || ticket?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const id = String(ticket?.customer?.id || ticket?.customerId || "").trim().toLowerCase();
  return id ? `id:${id}` : "";
}

function attachmentIdentity(attachment) {
  return String(attachment?.id || attachment?.fileName || attachment?.name || attachment?.downloadUrl || "").trim().toLowerCase();
}

function duplicateStrings(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function timestampValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function ticketDisplayId(ticket) {
  const id = String(ticket?.id || "").trim();
  return id && /^ISP-/i.test(id) ? id : id ? `ISP-${id}` : "";
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
