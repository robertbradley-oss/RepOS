// RepOS local server: static app hosting plus MVP JSON API persistence.
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { createJsonStore, normalizeEmail } from "./lib/json-store.mjs";
import { ValidationError, normalizeTicketStatus } from "./lib/ticket-workflow.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const dataFile = process.env.TESSARIO_DATA_FILE || join(root, ".data", "tessario-state.json");
const uploadDir = process.env.TESSARIO_UPLOAD_DIR || join(root, ".uploads");
const schemaPath = join(root, "db", "schema.sql");
const maxJsonBytes = 12 * 1024 * 1024;
const maxUploadBytes = Number(process.env.TESSARIO_MAX_UPLOAD_BYTES || 20 * 1024 * 1024);
const authMode = process.env.TESSARIO_AUTH_MODE || "development";
const sessionCookieName = "tessario_session";
const sessionDays = Number(process.env.TESSARIO_SESSION_DAYS || 7);
const allowedUploadTypes = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".txt", "text/plain"],
  [".csv", "text/csv"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
]);

const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml"
};

const resourceValidators = {
  tickets: Array.isArray,
  users: Array.isArray,
  profile: isPlainObject,
  settings: isPlainObject,
  notifications: Array.isArray,
  knowledgeDocs: Array.isArray,
  productLinks: Array.isArray,
  customerAccounts: isPlainObject,
  lastTicketNumber: (value) => Number.isInteger(value) && value >= 0
};
const adminStateResources = new Set(["users", "profile", "settings", "knowledgeDocs", "productLinks", "customerAccounts"]);

const store = await createStore();
await ensureConfiguredAuthUser();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(response, error.status || 400, {
        error: error.error || "invalid_request",
        message: error.message,
        details: error.details || {}
      });
      return;
    }
    sendJson(response, 500, {
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown server error"
    });
  }
});

server.listen(port, host, () => {
  console.log(`RepOS running at http://${host}:${port}`);
  console.log(`Persistence: ${store.mode}`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      app: "RepOS",
      mode: "mvp-backend",
      persistence: store.mode,
      authMode
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    const user = await getCurrentUser(request, response);
    sendJson(response, 200, {
      authenticated: Boolean(user),
      user: user ? publicUser(user) : null,
      authMode
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/users") {
    const user = await requireRole(request, response, ["admin", "owner"]);
    if (!user) return;
    sendJson(response, 200, { users: (await store.listAuthUsers()).map(publicUser) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/dev-login") {
    if (process.env.TESSARIO_DISABLE_DEV_LOGIN === "1") {
      sendJson(response, 403, { error: "dev_login_disabled" });
      return;
    }
    const input = await readJsonBody(request);
    const email = isPlainObject(input) && input.email ? String(input.email) : defaultAuthUser().email;
    const user = await store.findAuthUserByEmail(email) || await store.ensureAuthUser(defaultAuthUser());
    const session = await createSessionForUser(response, user);
    sendJson(response, 200, { authenticated: true, user: publicUser(user), expiresAt: session.expiresAt });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(request.headers.cookie || "")[sessionCookieName];
    if (token) await store.deleteAuthSession(token);
    setCookie(response, expiredSessionCookie());
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/bootstrap") {
    const user = await requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, {
      state: await store.loadState(),
      session: {
        authenticated: Boolean(user),
        user: user ? publicUser(user) : null,
        authMode
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/settings") {
    const user = await requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, { settings: await workspaceSettings() });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/settings") {
    const user = await requireRole(request, response, ["admin", "owner"]);
    if (!user) return;
    const patch = await readJsonBody(request);
    const current = await workspaceSettings();
    const validation = validateWorkspaceSettingsPatch(patch, current);
    if (!validation.ok) {
      sendJson(response, 400, validation.error);
      return;
    }
    const updatedAt = await store.setResource("settings", validation.value);
    await ensureConfiguredAuthUser(validation.value);
    sendJson(response, 200, { settings: validation.value, updatedAt });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tickets") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const filters = ticketFiltersFromSearch(url.searchParams, user);
    sendJson(response, 200, {
      tickets: await store.listTickets(filters)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/tickets") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const input = await readJsonBody(request);
    sendJson(response, 201, { ticket: await store.createTicket(input, { actor: user }) });
    return;
  }

  const ticketRoute = url.pathname.match(/^\/api\/tickets\/([^/]+)(?:\/(messages|notes|attachments))?$/);
  if (ticketRoute) {
    const ticketId = decodeURIComponent(ticketRoute[1]);
    const childRoute = ticketRoute[2] || "";

    if (request.method === "GET" && !childRoute) {
      const user = await requireAuth(request, response);
      if (!user) return;
      const ticket = await store.getTicket(ticketId);
      sendJson(response, ticket ? 200 : 404, ticket ? { ticket } : { error: "ticket_not_found" });
      return;
    }

    if (request.method === "PATCH" && !childRoute) {
      const user = await requireAuth(request, response);
      if (!user) return;
      const patch = await readJsonBody(request);
      const ticket = await store.patchTicket(ticketId, patch, { actor: user });
      sendJson(response, ticket ? 200 : 404, ticket ? { ticket } : { error: "ticket_not_found" });
      return;
    }

    if (request.method === "POST" && (childRoute === "messages" || childRoute === "notes")) {
      const user = await requireAuth(request, response);
      if (!user) return;
      const input = await readJsonBody(request);
      const result = await store.appendTicketMessage(ticketId, {
        ...input,
        type: childRoute === "notes" ? "note" : input?.type || "rep"
      }, { actor: user, type: childRoute === "notes" ? "note" : "rep" });
      sendJson(response, result ? 201 : 404, result || { error: "ticket_not_found" });
      return;
    }

    if (request.method === "POST" && childRoute === "attachments") {
      const user = await requireAuth(request, response);
      if (!user) return;
      const input = await readJsonBody(request);
      const result = await store.appendTicketAttachment(ticketId, input, { actor: user });
      sendJson(response, result ? 201 : 404, result || { error: "ticket_not_found" });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/customers") {
    const user = await requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, {
      customers: await store.listCustomers(Object.fromEntries(url.searchParams.entries()))
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/customers") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const input = await readJsonBody(request);
    if (!isPlainObject(input) || !String(input.email || "").trim()) {
      sendJson(response, 400, { error: "invalid_customer_payload" });
      return;
    }
    const customer = await store.createCustomer(input);
    sendJson(response, customer ? 201 : 400, customer ? { customer } : { error: "invalid_customer_payload" });
    return;
  }

  const customerByEmailRoute = url.pathname.match(/^\/api\/customers\/by-email\/([^/]+)$/);
  if (request.method === "GET" && customerByEmailRoute) {
    const user = await requireAuth(request, response);
    if (!user) return;
    const email = normalizeEmail(decodeURIComponent(customerByEmailRoute[1]));
    if (!isValidCustomerLookupEmail(email)) {
      sendJson(response, 400, {
        error: "invalid_customer_email",
        message: "Customer email lookup must use a valid email address."
      });
      return;
    }
    const customer = await store.getCustomerByEmail(email);
    sendJson(response, customer ? 200 : 404, customer ? { customer } : { error: "customer_not_found" });
    return;
  }

  const customerReceiptUploadRoute = url.pathname.match(/^\/api\/customers\/([^/]+)\/receipts\/upload$/);
  if (request.method === "POST" && customerReceiptUploadRoute) {
    const user = await requireAuth(request, response);
    if (!user) return;
    const customerId = decodeURIComponent(customerReceiptUploadRoute[1]);
    const customer = await store.getCustomer(customerId);
    if (!customer) {
      sendJson(response, 404, { error: "customer_not_found" });
      return;
    }

    const upload = await parseUploadRequest(request);
    if (!upload.file) {
      sendJson(response, 400, { error: "missing_file" });
      return;
    }
    const file = await persistUploadedFile(upload.file, {
      category: "customer_receipt",
      ownerType: "customer",
      ownerId: customer.id,
      uploadedBy: user.id,
      extra: {
        customerEmail: customer.email,
        customerName: customer.name
      }
    });
    const receipt = {
      id: upload.fields.receiptId || randomUUID(),
      fileName: file.originalName,
      fileType: file.extension.slice(1).toUpperCase(),
      fileSize: file.sizeBytes,
      mimeType: file.mimeType,
      source: upload.fields.source || customer.purchaseSource || "Uploaded",
      orderNumber: upload.fields.orderNumber || customer.orderNumber || "",
      model: upload.fields.model || "",
      status: upload.fields.status || "Uploaded",
      uploadDate: file.createdAt,
      savedAt: file.createdAt,
      uploadedBy: user.displayName || user.repName || user.email,
      fileId: file.id,
      downloadUrl: file.downloadUrl
    };
    const result = await store.addCustomerReceipt(customer.id, receipt);
    sendJson(response, result ? 201 : 404, result ? { ...result, file: toPublicFileRecord(file) } : { error: "customer_not_found" });
    return;
  }

  const customerRoute = url.pathname.match(/^\/api\/customers\/([^/]+)(?:\/(tickets|notes|receipts|warranties))?$/);
  if (customerRoute) {
    const user = await requireAuth(request, response);
    if (!user) return;
    const customerId = decodeURIComponent(customerRoute[1]);
    const childRoute = customerRoute[2] || "";

    if (request.method === "GET" && !childRoute) {
      const customer = await store.getCustomer(customerId);
      sendJson(response, customer ? 200 : 404, customer ? { customer } : { error: "customer_not_found" });
      return;
    }

    if (request.method === "PATCH" && !childRoute) {
      const patch = await readJsonBody(request);
      const validation = validateCustomerPatch(patch);
      if (!validation.ok) {
        sendJson(response, 400, validation.error);
        return;
      }
      const customer = await store.patchCustomer(customerId, validation.value);
      sendJson(response, customer ? 200 : 404, customer ? { customer } : { error: "customer_not_found" });
      return;
    }

    if (request.method === "GET" && childRoute === "tickets") {
      const tickets = await store.listCustomerTickets(customerId);
      sendJson(response, tickets ? 200 : 404, tickets ? { tickets } : { error: "customer_not_found" });
      return;
    }

    if (request.method === "POST" && ["notes", "receipts", "warranties"].includes(childRoute)) {
      const input = await readJsonBody(request);
      if (!isPlainObject(input)) {
        sendJson(response, 400, { error: "invalid_customer_child_payload" });
        return;
      }
      if (childRoute === "notes" && !String(input.body || "").trim()) {
        sendJson(response, 400, { error: "invalid_customer_note_payload" });
        return;
      }
      const result = childRoute === "notes"
        ? await store.addCustomerNote(customerId, input)
        : childRoute === "receipts"
          ? await store.addCustomerReceipt(customerId, input)
          : await store.addCustomerWarranty(customerId, input);
      sendJson(response, result ? 201 : 404, result || { error: "customer_not_found" });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/knowledge/files/upload") {
    const user = await requireRole(request, response, ["admin", "owner"]);
    if (!user) return;
    const upload = await parseUploadRequest(request);
    if (!upload.file) {
      sendJson(response, 400, { error: "missing_file" });
      return;
    }
    const file = await persistUploadedFile(upload.file, {
      category: "knowledge",
      ownerType: "workspace",
      ownerId: "ispring-model",
      uploadedBy: user.id
    });
    const docs = await store.getResource("knowledgeDocs");
    const knowledgeDocs = Array.isArray(docs) ? docs : [];
    const document = {
      id: upload.fields.documentId || randomUUID(),
      fileName: file.originalName,
      fileType: file.extension.slice(1).toUpperCase(),
      fileSize: file.sizeBytes,
      mimeType: file.mimeType,
      uploadDate: file.createdAt,
      uploadedBy: user.displayName || user.repName || user.email,
      category: upload.fields.category || "General",
      status: upload.fields.status || "Pending Review",
      approvedForAi: parseBoolean(upload.fields.approvedForAi, false),
      internalOnly: parseBoolean(upload.fields.internalOnly, true),
      customerFacingAllowed: parseBoolean(upload.fields.customerFacingAllowed, false),
      owner: upload.fields.owner || user.displayName || user.repName || user.email,
      description: upload.fields.description || "",
      reviewDate: upload.fields.reviewDate || "",
      fileId: file.id,
      downloadUrl: file.downloadUrl
    };
    await store.setResource("knowledgeDocs", [document, ...knowledgeDocs.filter((item) => item.id !== document.id)]);
    sendJson(response, 201, { document, file: toPublicFileRecord(file) });
    return;
  }

  const fileRoute = url.pathname.match(/^\/api\/files\/([^/]+)$/);
  if (request.method === "GET" && fileRoute) {
    const user = await requireAuth(request, response);
    if (!user) return;
    const record = await store.getFileRecord(decodeURIComponent(fileRoute[1]));
    if (!record) {
      sendJson(response, 404, { error: "file_not_found" });
      return;
    }
    await sendStoredFile(response, record);
    return;
  }

  const stateMatch = url.pathname.match(/^\/api\/state\/([A-Za-z0-9_-]+)$/);
  if (stateMatch) {
    const resource = stateMatch[1];
    if (!resourceValidators[resource]) {
      sendJson(response, 404, { error: "unknown_resource" });
      return;
    }

    if (request.method === "GET") {
      const user = await requireAuth(request, response);
      if (!user) return;
      sendJson(response, 200, { resource, value: await store.getResource(resource) });
      return;
    }

    if (request.method === "PUT") {
      const user = adminStateResources.has(resource)
        ? await requireRole(request, response, ["admin", "owner"])
        : await requireAuth(request, response);
      if (!user) return;
      const value = await readJsonBody(request);
      if (!resourceValidators[resource](value)) {
        sendJson(response, 400, { error: "invalid_resource_payload", resource });
        return;
      }
      const updatedAt = await store.setResource(resource, value);
      sendJson(response, 200, { ok: true, resource, updatedAt });
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/reset") {
    const user = await requireRole(request, response, ["admin", "owner"]);
    if (!user) return;
    sendJson(response, 200, { ok: true, state: await store.resetState() });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(decodeURIComponent(requestedPath)).replace(/^[/\\]+/, "");
  const filePath = resolve(root, normalized);

  if (!filePath.startsWith(resolve(root))) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": staticTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function defaultState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tickets: null,
    users: null,
    profile: null,
    settings: defaultWorkspaceSettings(),
    notifications: null,
    knowledgeDocs: null,
    productLinks: null,
    customerAccounts: null,
    lastTicketNumber: null,
    authUsers: null,
    authSessions: null,
    fileRecords: null
  };
}

async function createStore() {
  if (process.env.DATABASE_URL) {
    const { createPostgresStore } = await import("./lib/postgres-store.mjs");
    return createPostgresStore({
      databaseUrl: process.env.DATABASE_URL,
      schemaPath,
      defaultState
    });
  }
  return createJsonStore({ dataFile, defaultState });
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxJsonBytes) {
      throw new ValidationError("json_body_too_large", "JSON body is too large.", { maxBytes: maxJsonBytes }, 413);
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError("invalid_json", "Request body must be valid JSON.");
  }
}

async function parseUploadRequest(request) {
  const contentType = request.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!contentType.includes("multipart/form-data") || !boundary) {
    throw new Error("Expected multipart/form-data upload.");
  }
  const body = await readLimitedBody(request, maxUploadBytes);
  const parts = parseMultipartBody(body, boundary);
  const fields = {};
  let file = null;
  for (const part of parts) {
    if (!part.name) continue;
    if (part.filename) {
      file = file || part;
    } else {
      fields[part.name] = part.data.toString("utf8");
    }
  }
  return { fields, file };
}

async function readLimitedBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new Error("Upload body is too large.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseMultipartBody(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const crlf = Buffer.from("\r\n");
  const parts = [];
  let boundaryIndex = body.indexOf(boundaryBuffer);

  while (boundaryIndex !== -1) {
    let partStart = boundaryIndex + boundaryBuffer.length;
    if (body.slice(partStart, partStart + 2).equals(Buffer.from("--"))) break;
    if (body.slice(partStart, partStart + 2).equals(crlf)) partStart += 2;

    const nextBoundary = body.indexOf(boundaryBuffer, partStart);
    if (nextBoundary === -1) break;

    let part = body.slice(partStart, nextBoundary);
    if (part.slice(-2).equals(crlf)) part = part.slice(0, -2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headerText = part.slice(0, headerEnd).toString("utf8");
      const data = part.slice(headerEnd + 4);
      const headers = Object.fromEntries(
        headerText.split(/\r\n/).map((line) => {
          const index = line.indexOf(":");
          return index === -1 ? [line.toLowerCase(), ""] : [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()];
        })
      );
      const disposition = headers["content-disposition"] || "";
      const name = disposition.match(/name="([^"]+)"/)?.[1] || "";
      const filename = disposition.match(/filename="([^"]*)"/)?.[1] || "";
      parts.push({
        name,
        filename,
        mimeType: headers["content-type"] || "application/octet-stream",
        data
      });
    }

    boundaryIndex = nextBoundary;
  }

  return parts;
}

async function persistUploadedFile(file, { category, ownerType, ownerId, uploadedBy, extra = {} }) {
  const originalName = sanitizeFileName(file.filename);
  const extension = extname(originalName).toLowerCase();
  if (!allowedUploadTypes.has(extension)) {
    throw new Error(`Unsupported upload type: ${extension || "unknown"}`);
  }
  if (!file.data.length) {
    throw new Error("Uploaded file is empty.");
  }

  const id = randomUUID();
  const storedName = `${id}${extension}`;
  const storagePath = resolve(uploadDir, storedName);
  if (!isPathInside(storagePath, uploadDir)) {
    throw new Error("Invalid upload storage path.");
  }
  await mkdir(uploadDir, { recursive: true });
  await writeFile(storagePath, file.data);
  const record = await store.createFileRecord({
    id,
    category,
    ownerType,
    ownerId,
    originalName,
    storedName,
    storagePath,
    extension,
    mimeType: normalizeMimeType(file.mimeType, extension),
    sizeBytes: file.data.length,
    uploadedBy,
    createdAt: new Date().toISOString(),
    downloadUrl: `/api/files/${encodeURIComponent(id)}`,
    ...extra
  });
  return {
    ...record,
    extension,
    downloadUrl: record.downloadUrl || `/api/files/${encodeURIComponent(record.id)}`
  };
}

async function sendStoredFile(response, record) {
  const filePath = resolve(record.storagePath || "");
  if (!isPathInside(filePath, uploadDir)) {
    sendJson(response, 403, { error: "invalid_file_path" });
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": record.mimeType || "application/octet-stream",
      "Content-Length": body.length,
      "Content-Disposition": `attachment; filename="${escapeHeaderFileName(record.originalName || record.storedName || "download")}"`,
      "Cache-Control": "no-store",
      ...pendingHeaders(response)
    });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: "file_not_found" });
  }
}

function toPublicFileRecord(record) {
  const { storagePath, storedName, ...publicRecord } = record;
  return publicRecord;
}

function sanitizeFileName(name) {
  const clean = basename(String(name || "upload").replace(/[/\\]/g, "_")).replace(/[\u0000-\u001f"]/g, "").trim();
  return clean || "upload";
}

function escapeHeaderFileName(name) {
  return sanitizeFileName(name).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeMimeType(mimeType, extension) {
  const expected = allowedUploadTypes.get(extension) || "application/octet-stream";
  if (!mimeType || mimeType === "application/octet-stream") return expected;
  return mimeType;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function ticketFiltersFromSearch(searchParams, user) {
  const filters = Object.fromEntries(searchParams.entries());
  const assignee = String(filters.assignee || "").trim().toLowerCase();
  if (["me", "current", "current-user"].includes(assignee)) {
    filters.assignee = user.repName || user.displayName || user.email || "";
  }
  return filters;
}

function isValidCustomerLookupEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function defaultWorkspaceSettings() {
  return {
    workspaceName: "iSpring Water Systems",
    workspaceLabel: "Workspace: iSpring Water Systems",
    supportEmail: "support@ispringfilters.com",
    currentUserName: "CS14 Robert",
    currentUserRole: "admin",
    defaultAssignee: "CS14 Robert",
    timezone: "America/New_York",
    demoMode: true,
    allowedStatuses: ["Open", "Closed, Waiting On Response", "Closed"]
  };
}

async function workspaceSettings() {
  return normalizeWorkspaceSettings(await store.getResource("settings"));
}

async function ensureConfiguredAuthUser(settings = null) {
  return store.ensureAuthUser(defaultAuthUser(settings || await workspaceSettings()));
}

function normalizeWorkspaceSettings(value = {}) {
  const defaults = defaultWorkspaceSettings();
  const source = isPlainObject(value) ? value : {};
  const allowedStatuses = normalizeAllowedStatuses(source.allowedStatuses, defaults.allowedStatuses);
  return {
    workspaceName: cleanSettingText(source.workspaceName, defaults.workspaceName, 80),
    workspaceLabel: cleanSettingText(source.workspaceLabel, defaults.workspaceLabel, 120),
    supportEmail: normalizeSettingsEmail(source.supportEmail, defaults.supportEmail),
    currentUserName: cleanSettingText(source.currentUserName, defaults.currentUserName, 80),
    currentUserRole: normalizeSettingsRole(source.currentUserRole, defaults.currentUserRole),
    defaultAssignee: cleanSettingText(source.defaultAssignee, defaults.defaultAssignee, 80),
    timezone: cleanSettingText(source.timezone, defaults.timezone, 80),
    demoMode: typeof source.demoMode === "boolean" ? source.demoMode : defaults.demoMode,
    allowedStatuses: allowedStatuses.length ? allowedStatuses : defaults.allowedStatuses
  };
}

function validateWorkspaceSettingsPatch(patch, current) {
  if (!isPlainObject(patch)) {
    return { ok: false, error: { error: "invalid_settings_patch", message: "Settings patch must be an object." } };
  }
  const allowed = new Set(Object.keys(defaultWorkspaceSettings()));
  const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
  if (unknown.length) {
    return {
      ok: false,
      error: {
        error: "unsupported_settings_fields",
        message: "Settings patch contains unsupported fields.",
        details: { fields: unknown }
      }
    };
  }

  const next = { ...current };
  for (const [key, raw] of Object.entries(patch)) {
    if (["workspaceName", "workspaceLabel", "currentUserName", "defaultAssignee", "timezone"].includes(key)) {
      const text = String(raw ?? "").replace(/[\u0000-\u001f]/g, "").trim();
      if (!text) return invalidSetting(key, `${key} is required.`);
      if (text.length > (key === "workspaceLabel" ? 120 : 80)) return invalidSetting(key, `${key} is too long.`);
      next[key] = text;
    } else if (key === "supportEmail") {
      const email = String(raw || "").trim().toLowerCase();
      if (!isValidCustomerLookupEmail(email)) return invalidSetting(key, "supportEmail must be a valid email address.");
      next.supportEmail = email;
    } else if (key === "currentUserRole") {
      const role = normalizeSettingsRole(raw, "");
      if (!role) return invalidSetting(key, "currentUserRole must be admin, manager, rep, or owner.");
      next.currentUserRole = role;
    } else if (key === "demoMode") {
      if (typeof raw !== "boolean") return invalidSetting(key, "demoMode must be a boolean.");
      next.demoMode = raw;
    } else if (key === "allowedStatuses") {
      if (!Array.isArray(raw)) return invalidSetting(key, "allowedStatuses must be an array of status names.");
      const statuses = normalizeAllowedStatuses(raw, []);
      if (hasUnsupportedAllowedStatus(raw)) {
        return invalidSetting(key, "allowedStatuses can only include supported ticket workflow statuses.");
      }
      if (!statuses.length) return invalidSetting(key, "allowedStatuses must include at least one status.");
      next.allowedStatuses = statuses;
    }
  }
  return { ok: true, value: normalizeWorkspaceSettings(next) };
}

function invalidSetting(field, message) {
  return { ok: false, error: { error: "invalid_settings_value", message, details: { field } } };
}

function cleanSettingText(value, fallback, maxLength) {
  const text = String(value || "").replace(/[\u0000-\u001f]/g, "").trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeSettingsEmail(value, fallback) {
  const email = String(value || "").trim().toLowerCase();
  return isValidCustomerLookupEmail(email) ? email : fallback;
}

function normalizeSettingsRole(value, fallback) {
  const role = String(value || "").trim().toLowerCase();
  return ["admin", "manager", "rep", "owner"].includes(role) ? role : fallback;
}

function normalizeAllowedStatuses(value, fallback) {
  const statuses = Array.isArray(value) ? value : fallback;
  const normalized = [];
  for (const status of statuses) {
    const text = String(status || "").replace(/[\u0000-\u001f]/g, "").trim();
    if (!text) continue;
    try {
      normalized.push(normalizeTicketStatus(text, { required: true }));
    } catch {
      // Ignore unsupported persisted legacy values; PATCH validation rejects them.
    }
  }
  return [...new Set(normalized)].slice(0, 12);
}

function hasUnsupportedAllowedStatus(value) {
  return value.some((status) => {
    const text = String(status || "").replace(/[\u0000-\u001f]/g, "").trim();
    if (!text) return false;
    try {
      normalizeTicketStatus(text, { required: true });
      return false;
    } catch {
      return true;
    }
  });
}

function validateCustomerPatch(patch) {
  if (!isPlainObject(patch)) {
    return { ok: false, error: { error: "invalid_customer_patch", message: "Customer patch must be an object." } };
  }
  const allowed = new Set(["id", "email", "name", "phone", "mobile", "address", "purchaseSource", "orderNumber", "notes", "warrantyRegistered", "warrantyRegisteredAt"]);
  const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
  if (unknown.length) {
    return {
      ok: false,
      error: {
        error: "unsupported_customer_patch_fields",
        message: "Customer patch contains unsupported fields.",
        details: { fields: unknown }
      }
    };
  }
  const value = {};
  for (const [key, raw] of Object.entries(patch)) {
    if (key === "warrantyRegistered") {
      value[key] = Boolean(raw);
    } else if (key === "warrantyRegisteredAt") {
      if (!raw) value[key] = "";
      else {
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
          return { ok: false, error: { error: "invalid_customer_date", message: "warrantyRegisteredAt must be a valid date.", details: { field: key } } };
        }
        value[key] = date.toISOString();
      }
    } else if (key === "email") {
      const email = String(raw || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: { error: "invalid_customer_email", message: "Customer email is invalid.", details: { field: key } } };
      }
      value[key] = email;
    } else {
      const text = String(raw ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
      if (text.length > 20000) {
        return { ok: false, error: { error: "customer_field_too_long", message: `${key} is too long.`, details: { field: key } } };
      }
      value[key] = text;
    }
  }
  return { ok: true, value };
}

function isPathInside(filePath, directory) {
  const rootPath = resolve(directory);
  const resolvedPath = resolve(filePath);
  return resolvedPath === rootPath || resolvedPath.startsWith(`${rootPath}\\`) || resolvedPath.startsWith(`${rootPath}/`);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...pendingHeaders(response)
  });
  response.end(JSON.stringify(payload));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function requireAuth(request, response) {
  const user = await getCurrentUser(request, response);
  if (!user) {
    sendJson(response, 401, { error: "authentication_required" });
    return null;
  }
  return user;
}

async function requireRole(request, response, roles) {
  const user = await requireAuth(request, response);
  if (!user) return null;
  if (!roles.includes(String(user.role || "").toLowerCase())) {
    sendJson(response, 403, { error: "insufficient_role", required: roles });
    return null;
  }
  return user;
}

async function getCurrentUser(request, response) {
  const token = parseCookies(request.headers.cookie || "")[sessionCookieName];
  if (token) {
    const result = await store.getAuthSession(token);
    if (result?.user) return result.user;
  }
  if (authMode === "strict") return null;
  const user = await store.ensureAuthUser(defaultAuthUser());
  await createSessionForUser(response, user);
  return user;
}

async function createSessionForUser(response, user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  const session = await store.createAuthSession(user.id, { token, expiresAt });
  setCookie(response, sessionCookie(token, expiresAt));
  return session;
}

function defaultAuthUser(settings = defaultWorkspaceSettings()) {
  const currentSettings = normalizeWorkspaceSettings(settings);
  return {
    id: "cs14-robert",
    email: "robbybradley@gmail.com",
    displayName: currentSettings.currentUserName,
    repName: currentSettings.currentUserName,
    role: currentSettings.currentUserRole,
    active: true
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    repName: user.repName,
    role: user.role,
    active: user.active !== false
  };
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function sessionCookie(token, expiresAt) {
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`;
}

function expiredSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function setCookie(response, cookie) {
  response.__tessarioHeaders = response.__tessarioHeaders || {};
  const existing = response.__tessarioHeaders["Set-Cookie"];
  response.__tessarioHeaders["Set-Cookie"] = existing ? [...existing, cookie] : [cookie];
}

function pendingHeaders(response) {
  return response.__tessarioHeaders || {};
}
