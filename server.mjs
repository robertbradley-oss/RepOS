// RepOS local server: static app hosting plus MVP JSON API persistence.
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import * as oidc from "openid-client";
import { buildAnalyticsSummary } from "./lib/activity-analytics.mjs";
import { createJsonStore, normalizeEmail } from "./lib/json-store.mjs";
import {
  filterTicketsForQueueView,
  findQueueView,
  parseQueueTicketQuery,
  queueViewsForState
} from "./lib/queue-views.mjs";
import { withTicketSla, withTicketsSla } from "./lib/ticket-sla.mjs";
import { ValidationError, normalizeTicketStatus } from "./lib/ticket-workflow.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (isRailwayRuntime() ? "0.0.0.0" : "127.0.0.1");
const nodeEnv = process.env.NODE_ENV || "development";
const dataFile = process.env.TESSARIO_DATA_FILE || join(root, ".data", "tessario-state.json");
const uploadDir = process.env.TESSARIO_UPLOAD_DIR || join(root, ".uploads");
const schemaPath = join(root, "db", "schema.sql");
const maxJsonBytes = 12 * 1024 * 1024;
const maxUploadBytes = Number(process.env.TESSARIO_MAX_UPLOAD_BYTES || 20 * 1024 * 1024);
const authMode = resolveAuthMode();
const sessionCookieName = "tessario_session";
const ssoStateCookieName = "repos_sso_state";
const sessionSecret = process.env.REPOS_SESSION_SECRET || process.env.TESSARIO_SESSION_SECRET || "";
const sessionSecretConfigured = Boolean(sessionSecret);
const ssoStateSecret = sessionSecret || randomBytes(32).toString("base64url");
const sessionSecretStrong = sessionSecret.length >= 32;
const sessionDays = normalizeSessionDays(process.env.TESSARIO_SESSION_DAYS, 7);
const automaticSessionAuthEnabled = authMode === "development";
const devLoginEnabled = process.env.TESSARIO_DISABLE_DEV_LOGIN !== "1" && ["development", "demo"].includes(authMode);
const adminRoles = ["admin", "owner"];
const secureSessionCookies = process.env.REPOS_SECURE_COOKIES === "1" ||
  (process.env.REPOS_SECURE_COOKIES !== "0" && (nodeEnv === "production" || Boolean(process.env.VERCEL)));
const demoPassword = authMode === "strict" ? "" : process.env.REPOS_DEMO_PASSWORD || "repos-demo";
const productionAdminEmail = normalizeEmail(process.env.REPOS_ADMIN_EMAIL || process.env.TESSARIO_ADMIN_EMAIL || "");
const productionAdminPassword = process.env.REPOS_ADMIN_PASSWORD || process.env.TESSARIO_ADMIN_PASSWORD || "";
const productionAdminPasswordHash = process.env.REPOS_ADMIN_PASSWORD_HASH || process.env.TESSARIO_ADMIN_PASSWORD_HASH || "";
const productionAdminRole = normalizeAuthRole(process.env.REPOS_ADMIN_ROLE || process.env.TESSARIO_ADMIN_ROLE || "admin", "admin");
const productionAdminConfigured = Boolean(productionAdminEmail && (productionAdminPassword || productionAdminPasswordHash));
const ssoConfig = readSsoConfig(process.env);
let ssoClientCache = null;
const appInfo = await loadAppInfo();

// Password hashing: scrypt with a per-user random salt, stored as
// "scrypt$<saltHex>$<hashHex>". Verification is constant-time.
function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  let derived;
  try {
    derived = scryptSync(String(password), Buffer.from(saltHex, "hex"), expected.length);
  } catch {
    return false;
  }
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
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
  queueViews: Array.isArray,
  notifications: Array.isArray,
  knowledgeDocs: Array.isArray,
  productLinks: Array.isArray,
  customerAccounts: isPlainObject,
  lastTicketNumber: (value) => Number.isInteger(value) && value >= 0
};
const adminStateResources = new Set(["users", "profile", "settings", "queueViews", "knowledgeDocs", "productLinks", "customerAccounts"]);
const nonAdminBootstrapHiddenResources = new Set(["knowledgeDocs", "authUsers", "authSessions", "fileRecords", "macros"]);

const store = await createStore();
const startupDiagnostics = await buildStartupDiagnostics();
reportStartupDiagnostics(startupDiagnostics);
if (!startupDiagnostics.ready) {
  console.error("RepOS startup blocked by unsafe production configuration.");
  process.exit(1);
}
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
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      app: "RepOS",
      version: appInfo.version,
      commit: appInfo.commit,
      mode: "mvp-backend",
      nodeEnv,
      persistence: store.mode,
      persistenceMode: store.mode,
      storage: startupDiagnostics.storage,
      database: startupDiagnostics.database,
      authMode,
      auth: authRuntimeInfo(),
      readiness: {
        ready: startupDiagnostics.ready,
        errors: startupDiagnostics.errors,
        warnings: startupDiagnostics.warnings
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    const user = await getCurrentUser(request, response);
    sendJson(response, 200, {
      authenticated: Boolean(user),
      user: user ? publicUser(user) : null,
      authMode,
      auth: authRuntimeInfo()
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users/current") {
    const user = await requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, { user: publicUser(user) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users") {
    const user = await requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, { users: await activePublicUsers() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/users") {
    const user = await requireAdmin(request, response);
    if (!user) return;
    sendJson(response, 200, { users: (await store.listAuthUsers()).map(publicUser) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/sso/config") {
    sendJson(response, 200, publicSsoConfig());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/sso/start") {
    if (!ssoConfig.ready) {
      sendJson(response, 400, {
        error: ssoConfig.enabled ? "sso_not_configured" : "sso_disabled",
        message: "Enterprise SSO is not enabled for this RepOS workspace."
      });
      return;
    }

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const pkceCodeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(pkceCodeVerifier);
    setCookie(response, ssoStateCookie({ state, nonce, pkceCodeVerifier }));

    const ssoClient = await getSsoClient();
    const redirectTo = oidc.buildAuthorizationUrl(ssoClient, {
      redirect_uri: ssoConfig.redirectUri,
      scope: ssoConfig.scopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });
    redirect(response, redirectTo.href);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/sso/callback") {
    await handleSsoCallback(request, response, url);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/dev-login") {
    if (!devLoginEnabled) {
      sendJson(response, 403, { error: "dev_login_disabled", authMode });
      return;
    }
    const input = await readJsonBody(request);
    const email = isPlainObject(input) && input.email ? String(input.email) : defaultAuthUser().email;
    const user = await store.findAuthUserByEmail(email) || await store.ensureAuthUser(defaultAuthUser());
    const session = await createSessionForUser(response, user);
    sendJson(response, 200, { authenticated: true, user: publicUser(user), expiresAt: session.expiresAt });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const input = await readJsonBody(request);
    const email = normalizeEmail(isPlainObject(input) ? input.email : "");
    const password = isPlainObject(input) && input.password != null ? String(input.password) : "";
    if (!email || !password) {
      sendJson(response, 400, { error: "missing_credentials" });
      return;
    }
    const fallback = defaultAuthUser();
    let user = (await store.listAuthUsers()).find((item) => normalizeEmail(item.email) === email) || null;
    if (!user && authMode !== "strict" && demoPassword && email === normalizeEmail(fallback.email)) {
      user = await store.ensureAuthUser({ ...fallback, passwordHash: hashPassword(demoPassword) });
    } else if (user && authMode !== "strict" && demoPassword && !user.passwordHash && normalizeEmail(user.email) === normalizeEmail(fallback.email)) {
      user = await store.ensureAuthUser({ ...user, passwordHash: hashPassword(demoPassword) });
    }
    if (!user || user.active === false || !verifyPassword(password, user.passwordHash)) {
      sendJson(response, 401, { error: "invalid_credentials" });
      return;
    }
    const session = await createSessionForUser(response, user);
    sendJson(response, 200, { authenticated: true, user: publicUser(user), expiresAt: session.expiresAt });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = sessionTokenFromCookie(parseCookies(request.headers.cookie || "")[sessionCookieName]);
    if (token) await store.deleteAuthSession(token);
    setCookie(response, expiredSessionCookie());
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/bootstrap") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const state = await stateWithPublicAuthUsers(await store.loadState());
    sendJson(response, 200, {
      state: stateForUser(state, user),
      session: {
        authenticated: Boolean(user),
        user: user ? publicUser(user) : null,
        authMode,
        auth: authRuntimeInfo()
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
    const user = await requireAdmin(request, response);
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

  if (request.method === "GET" && url.pathname === "/api/analytics/summary") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const options = analyticsOptionsFromSearch(url.searchParams);
    if (!options.ok) {
      sendJson(response, 400, options.error);
      return;
    }
    const state = await store.loadState();
    const tickets = Array.isArray(state.tickets)
      ? state.tickets
      : await store.listTickets({ limit: 500 });
    sendJson(response, 200, {
      summary: buildAnalyticsSummary({
        tickets,
        settings: await workspaceSettings(),
        user: userWithAssignmentName(user),
        windowHours: options.value.windowHours,
        recentActivityLimit: options.value.limit
      })
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/queue-views") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const settings = await workspaceSettings();
    const queueViews = queueViewsForState(await store.getResource("queueViews"), settings);
    sendJson(response, 200, { queueViews });
    return;
  }

  const queueViewTicketsRoute = url.pathname.match(/^\/api\/queue-views\/([^/]+)\/tickets$/);
  if (request.method === "GET" && queueViewTicketsRoute) {
    const user = await requireAuth(request, response);
    if (!user) return;
    const settings = await workspaceSettings();
    const queueViews = queueViewsForState(await store.getResource("queueViews"), settings);
    const queueView = findQueueView(queueViews, decodeURIComponent(queueViewTicketsRoute[1]));
    if (!queueView) {
      sendJson(response, 404, { error: "queue_view_not_found" });
      return;
    }
    const query = parseQueueTicketQuery(url.searchParams);
    if (!query.ok) {
      sendJson(response, 400, query.error);
      return;
    }
    const state = await store.loadState();
    const tickets = Array.isArray(state.tickets)
      ? state.tickets
      : await store.listTickets({ limit: 500 });
    const result = filterTicketsForQueueView(tickets, queueView, {
      currentUserName: currentAssignmentName(user) || settings.currentUserName || settings.defaultAssignee,
      settings
    }, query.value);
    sendJson(response, 200, {
      queueView,
      tickets: withTicketsSla(result.tickets, settings),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tickets") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const filters = ticketFiltersFromSearch(url.searchParams, user);
    const settings = await workspaceSettings();
    sendJson(response, 200, {
      tickets: withTicketsSla(await store.listTickets(filters), settings)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/tickets") {
    const user = await requireAuth(request, response);
    if (!user) return;
    const input = await readJsonBody(request);
    await validateTicketAssignee(input);
    const settings = await workspaceSettings();
    sendJson(response, 201, { ticket: withTicketSla(await store.createTicket(input, { actor: user }), settings) });
    return;
  }

  const ticketRoute = url.pathname.match(/^\/api\/tickets\/([^/]+)(?:\/(merge|messages|notes|attachments))?$/);
  if (ticketRoute) {
    const ticketId = decodeURIComponent(ticketRoute[1]);
    const childRoute = ticketRoute[2] || "";

    if (request.method === "GET" && !childRoute) {
      const user = await requireAuth(request, response);
      if (!user) return;
      const ticket = await store.getTicket(ticketId);
      const settings = await workspaceSettings();
      sendJson(response, ticket ? 200 : 404, ticket ? { ticket: withTicketSla(ticket, settings) } : { error: "ticket_not_found" });
      return;
    }

    if (request.method === "PATCH" && !childRoute) {
      const user = await requireAuth(request, response);
      if (!user) return;
      const patch = await readJsonBody(request);
      await validateTicketAssignee(patch);
      const ticket = await store.patchTicket(ticketId, patch, { actor: user });
      const settings = await workspaceSettings();
      sendJson(response, ticket ? 200 : 404, ticket ? { ticket: withTicketSla(ticket, settings) } : { error: "ticket_not_found" });
      return;
    }

    if (request.method === "POST" && childRoute === "merge") {
      const user = await requireAdmin(request, response);
      if (!user) return;
      const input = await readJsonBody(request);
      const result = await store.mergeTickets(ticketId, input, { actor: user });
      const settings = await workspaceSettings();
      sendJson(response, 200, {
        ...result,
        ticket: withTicketSla(result.ticket, settings)
      });
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
      const settings = await workspaceSettings();
      sendJson(response, result ? 201 : 404, result ? ticketResultWithSla(result, settings) : { error: "ticket_not_found" });
      return;
    }

    if (request.method === "POST" && childRoute === "attachments") {
      const user = await requireAuth(request, response);
      if (!user) return;
      const input = await readJsonBody(request);
      const result = await store.appendTicketAttachment(ticketId, input, { actor: user });
      const settings = await workspaceSettings();
      sendJson(response, result ? 201 : 404, result ? ticketResultWithSla(result, settings) : { error: "ticket_not_found" });
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
      const settings = await workspaceSettings();
      sendJson(response, tickets ? 200 : 404, tickets ? { tickets: withTicketsSla(tickets, settings) } : { error: "customer_not_found" });
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
    const user = await requireAdmin(request, response);
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
    if (fileRequiresAdminAccess(record) && !userHasRole(user, adminRoles)) {
      sendJson(response, 403, { error: "insufficient_role", required: adminRoles });
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
      const user = adminStateResources.has(resource)
        ? await requireAdmin(request, response)
        : await requireAuth(request, response);
      if (!user) return;
      sendJson(response, 200, { resource, value: await store.getResource(resource) });
      return;
    }

    if (request.method === "PUT") {
      const user = adminStateResources.has(resource)
        ? await requireAdmin(request, response)
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
    const user = await requireAdmin(request, response);
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
    queueViews: null,
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

function stateForUser(state, user) {
  if (userHasRole(user, adminRoles)) return state;
  const filtered = { ...state };
  for (const resource of nonAdminBootstrapHiddenResources) {
    delete filtered[resource];
  }
  return filtered;
}

async function stateWithPublicAuthUsers(state) {
  return {
    ...state,
    authUsers: (await store.listAuthUsers()).map(publicUser)
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

function resolveAuthMode() {
  const requested = String(process.env.TESSARIO_AUTH_MODE || "").trim().toLowerCase();
  const normalized = ["development", "demo", "strict"].includes(requested)
    ? requested
    : nodeEnv === "production"
      ? "strict"
      : "development";
  if (nodeEnv === "production" && normalized === "development") {
    return process.env.TESSARIO_ALLOW_DEVELOPMENT_AUTH_IN_PRODUCTION === "1" ? "development" : "strict";
  }
  return normalized;
}

function isRailwayRuntime() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_GIT_COMMIT_SHA
  );
}

function authRuntimeInfo() {
  const loginReadiness = startupDiagnostics?.auth || {};
  return {
    mode: authMode,
    automaticSession: automaticSessionAuthEnabled,
    devLogin: devLoginEnabled,
    passwordLogin: true,
    productionAdminConfigured,
    strictLoginConfigured: Boolean(loginReadiness.strictLoginConfigured),
    strictCredentialSource: loginReadiness.strictCredentialSource || "none",
    sessionSecretConfigured,
    sessionSecretStrong,
    secureCookies: secureSessionCookies,
    sessionDays,
    enterpriseSso: {
      enabled: ssoConfig.ready,
      configured: ssoConfig.ready,
      requested: ssoConfig.enabled
    },
    production: nodeEnv === "production"
  };
}

function readSsoConfig(env) {
  const enabled = String(env.REPOS_SSO_ENABLED || "").trim().toLowerCase() === "true";
  const issuer = cleanUrlEnv(env.REPOS_SSO_ISSUER);
  const clientId = String(env.REPOS_SSO_CLIENT_ID || "").trim();
  const clientSecret = String(env.REPOS_SSO_CLIENT_SECRET || "").trim();
  const redirectUri = cleanUrlEnv(env.REPOS_SSO_REDIRECT_URI);
  const scopes = String(env.REPOS_SSO_SCOPES || "openid email profile").trim() || "openid email profile";
  const allowedDomains = String(env.REPOS_SSO_ALLOWED_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  const missing = [];
  if (enabled && !issuer) missing.push("REPOS_SSO_ISSUER");
  if (enabled && !clientId) missing.push("REPOS_SSO_CLIENT_ID");
  if (enabled && !clientSecret) missing.push("REPOS_SSO_CLIENT_SECRET");
  if (enabled && !redirectUri) missing.push("REPOS_SSO_REDIRECT_URI");
  return {
    enabled,
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    allowedDomains,
    missing,
    ready: enabled && missing.length === 0
  };
}

function cleanUrlEnv(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).href;
  } catch {
    return "";
  }
}

function publicSsoConfig() {
  return {
    enabled: ssoConfig.ready,
    configured: ssoConfig.ready,
    requested: ssoConfig.enabled,
    provider: ssoConfig.issuer ? safeSsoIssuerLabel(ssoConfig.issuer) : null,
    scopes: ssoConfig.ready ? ssoConfig.scopes : "openid email profile",
    allowedDomains: ssoConfig.allowedDomains,
    missingRequiredConfig: ssoConfig.enabled ? ssoConfig.missing : []
  };
}

function safeSsoIssuerLabel(issuer) {
  try {
    const url = new URL(issuer);
    return url.host;
  } catch {
    return null;
  }
}

async function getSsoClient() {
  if (!ssoConfig.ready) throw new Error("Enterprise SSO is not configured.");
  const cacheKey = JSON.stringify({
    issuer: ssoConfig.issuer,
    clientId: ssoConfig.clientId,
    redirectUri: ssoConfig.redirectUri,
    scopes: ssoConfig.scopes
  });
  if (ssoClientCache?.cacheKey === cacheKey) return ssoClientCache.client;
  const client = await oidc.discovery(
    new URL(ssoConfig.issuer),
    ssoConfig.clientId,
    {
      client_secret: ssoConfig.clientSecret,
      redirect_uris: [ssoConfig.redirectUri],
      response_types: ["code"]
    },
    oidc.ClientSecretPost(ssoConfig.clientSecret)
  );
  ssoClientCache = { cacheKey, client };
  return client;
}

async function handleSsoCallback(request, response, url) {
  setCookie(response, expiredSsoStateCookie());
  try {
    if (!ssoConfig.ready) throw new Error("Enterprise SSO is not configured.");
    const stored = ssoStateFromCookie(parseCookies(request.headers.cookie || "")[ssoStateCookieName]);
    if (!stored?.state || !stored?.nonce || !stored?.pkceCodeVerifier) {
      throw new Error("Missing SSO state.");
    }

    const currentUrl = new URL(ssoConfig.redirectUri);
    currentUrl.search = url.search;
    const tokens = await oidc.authorizationCodeGrant(await getSsoClient(), currentUrl, {
      expectedState: stored.state,
      expectedNonce: stored.nonce,
      pkceCodeVerifier: stored.pkceCodeVerifier,
      idTokenExpected: true
    });
    const claims = tokens.claims();
    const user = await authUserFromSsoClaims(claims);
    await createSessionForUser(response, user);
    redirect(response, "/?sso=success");
  } catch {
    redirect(response, "/?sso_error=signin_failed");
  }
}

async function authUserFromSsoClaims(claims) {
  if (!claims || typeof claims !== "object") throw new Error("Missing ID token claims.");
  const email = normalizeEmail(claims.email || claims.preferred_username || claims.upn || "");
  if (!isValidCustomerLookupEmail(email)) throw new Error("SSO profile is missing an email address.");
  if (!ssoEmailDomainAllowed(email)) throw new Error("SSO email domain is not allowed.");
  const existing = await store.findAuthUserByEmail(email);
  const displayName = cleanSettingText(
    claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(" ") || existing?.displayName || existing?.repName,
    email,
    80
  );
  return store.ensureAuthUser({
    ...(existing || {}),
    id: existing?.id || authUserIdFromEmail(email),
    email,
    displayName,
    repName: existing?.repName || displayName,
    role: existing?.role || "rep",
    active: true,
    sso: {
      issuer: ssoConfig.issuer,
      lastLoginAt: new Date().toISOString()
    }
  });
}

function ssoEmailDomainAllowed(email) {
  if (!ssoConfig.allowedDomains.length) return true;
  const domain = String(email || "").split("@").pop()?.toLowerCase() || "";
  return ssoConfig.allowedDomains.includes(domain);
}

async function loadAppInfo() {
  let version = "0.0.0";
  try {
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    version = String(packageJson.version || version);
  } catch {
    // Keep health usable even if package metadata is unavailable.
  }
  const commit = firstNonEmptyEnv([
    "REPOS_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "GIT_COMMIT",
    "SOURCE_VERSION"
  ]);
  return {
    version,
    commit: commit ? commit.slice(0, 40) : null
  };
}

async function buildStartupDiagnostics() {
  const warnings = [];
  const errors = [];
  const persistedUsers = await store.listAuthUsers().catch(() => []);
  const persistedPasswordUsers = persistedUsers.filter((user) => user?.active !== false && isValidPasswordHash(user?.passwordHash));
  const productionAdminHashValid = !productionAdminPasswordHash || isValidPasswordHash(productionAdminPasswordHash);
  const strictCredentialSource = productionAdminPasswordHash
    ? "env-password-hash"
    : productionAdminPassword
      ? "env-password"
      : persistedPasswordUsers.length
        ? "persisted-password-user"
        : "none";
  const strictLoginConfigured = productionAdminConfigured || persistedPasswordUsers.length > 0;
  const production = nodeEnv === "production";

  if (authMode === "strict") {
    if (!strictLoginConfigured) {
      const message = "Strict mode has no env admin credentials and no active persisted password user.";
      if (production) errors.push(message);
      else warnings.push(message);
    }
    if (productionAdminPasswordHash && !productionAdminHashValid) {
      const message = "Configured admin password hash must use scrypt$saltHex$hashHex format.";
      if (production) errors.push(message);
      else warnings.push(message);
    }
    if (production && !sessionSecretStrong) {
      errors.push("Production strict mode requires REPOS_SESSION_SECRET or TESSARIO_SESSION_SECRET with at least 32 characters.");
    } else if (!sessionSecretConfigured) {
      warnings.push("No session secret configured; local sessions use unsigned random tokens.");
    } else if (!sessionSecretStrong) {
      warnings.push("Session secret is configured but shorter than the recommended 32 characters.");
    }
  }

  if (production && devLoginEnabled) {
    errors.push("Production must not expose development/demo login.");
  }
  if (production && authMode !== "strict") {
    warnings.push("Production should use TESSARIO_AUTH_MODE=strict for real deployments.");
  }
  if (production && !secureSessionCookies) {
    errors.push("Production requires secure session cookies; set REPOS_SECURE_COOKIES=1 or leave it unset.");
  }
  if (!Number.isFinite(sessionDays) || sessionDays <= 0) {
    errors.push("TESSARIO_SESSION_DAYS must be a positive number.");
  }
  if (ssoConfig.enabled && !ssoConfig.ready) {
    warnings.push(`Enterprise SSO is enabled but missing required configuration: ${ssoConfig.missing.join(", ")}.`);
  }

  const storage = storageRuntimeInfo();
  if (production && store.mode === "json-file" && !storage.dataFile.durable) {
    warnings.push("JSON persistence is not pointed at a known durable Railway volume such as /data.");
  }
  if (production && !storage.uploads.durable) {
    warnings.push("Uploads are not pointed at a known durable Railway volume such as /data/uploads.");
  }

  return {
    ready: errors.length === 0,
    errors,
    warnings,
    auth: {
      strictLoginConfigured,
      strictCredentialSource,
      persistedPasswordUsers: persistedPasswordUsers.length,
      productionAdminHashValid
    },
    database: databaseRuntimeInfo(),
    storage
  };
}

function reportStartupDiagnostics(diagnostics) {
  const auth = diagnostics.auth || {};
  console.log("RepOS startup diagnostics:");
  console.log(`- version: ${appInfo.version}${appInfo.commit ? ` (${appInfo.commit.slice(0, 12)})` : ""}`);
  console.log(`- NODE_ENV: ${nodeEnv}`);
  console.log(`- auth mode: ${authMode}`);
  console.log(`- dev/demo login: ${devLoginEnabled ? "enabled" : "disabled"}`);
  console.log(`- strict login configured: ${auth.strictLoginConfigured ? "yes" : "no"} (${auth.strictCredentialSource || "none"})`);
  console.log(`- enterprise SSO: ${ssoConfig.ready ? "enabled" : ssoConfig.enabled ? "misconfigured" : "disabled"}`);
  console.log(`- session secret: ${sessionSecretConfigured ? (sessionSecretStrong ? "configured" : "configured but short") : "not configured"}`);
  console.log(`- secure cookies: ${secureSessionCookies ? "enabled" : "disabled"}`);
  console.log(`- persistence: ${store.mode}`);
  console.log(`- data path: ${diagnostics.storage.dataFile.location}`);
  console.log(`- uploads path: ${diagnostics.storage.uploads.location}`);
  console.log(`- postgres: ${diagnostics.database.enabled ? `enabled ssl=${diagnostics.database.sslMode}` : "disabled"}`);
  for (const warning of diagnostics.warnings) console.warn(`RepOS config warning: ${warning}`);
  for (const error of diagnostics.errors) console.error(`RepOS config error: ${error}`);
}

function storageRuntimeInfo() {
  return {
    dataFile: pathRuntimeInfo(dataFile, { file: true }),
    uploads: pathRuntimeInfo(uploadDir, { file: false })
  };
}

function pathRuntimeInfo(inputPath, { file }) {
  const raw = String(inputPath || "");
  const resolved = resolve(raw);
  const relative = !isAbsoluteRuntimePath(raw);
  const underAppRoot = isPathInside(resolved, root);
  const durable = isKnownDurablePath(resolved);
  return {
    configured: Boolean(raw),
    type: relative ? "relative" : "absolute",
    scope: durable ? "durable-volume" : underAppRoot ? "app-local" : "external",
    durable,
    location: safeStorageLocation(raw, resolved, { relative, underAppRoot, durable, file })
  };
}

function databaseRuntimeInfo() {
  return {
    enabled: Boolean(process.env.DATABASE_URL),
    mode: process.env.DATABASE_URL ? "postgres" : "none",
    sslMode: process.env.PGSSLMODE || "default",
    autoMigrate: process.env.TESSARIO_AUTO_MIGRATE !== "0"
  };
}

function safeStorageLocation(raw, resolved, { relative, underAppRoot, durable, file }) {
  if (durable) return resolved.replace(/\\/g, "/").replace(/^\/data(\/.*)?$/, "/data$1");
  if (relative) return raw.replace(/\\/g, "/");
  if (underAppRoot) return file ? "app-local-file" : "app-local-dir";
  return file ? "external-file" : "external-dir";
}

function isKnownDurablePath(inputPath) {
  const normalizedPath = inputPath.replace(/\\/g, "/");
  return normalizedPath === "/data" || normalizedPath.startsWith("/data/");
}

function isAbsoluteRuntimePath(inputPath) {
  return /^([A-Za-z]:[\\/]|[/\\])/.test(String(inputPath || ""));
}

function firstNonEmptyEnv(names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function normalizeSessionDays(value, fallback) {
  const number = Number(value || fallback);
  return Number.isFinite(number) && number > 0 ? number : NaN;
}

function isValidPasswordHash(value) {
  if (typeof value !== "string") return false;
  const [scheme, saltHex, hashHex] = value.split("$");
  return scheme === "scrypt" &&
    /^[a-f0-9]{16,}$/i.test(saltHex || "") &&
    /^[a-f0-9]{64,}$/i.test(hashHex || "");
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
    throw new ValidationError("invalid_upload_request", "Expected multipart/form-data upload.", {
      field: "Content-Type"
    });
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
      throw new ValidationError("upload_body_too_large", "Upload body is too large.", { maxBytes }, 413);
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
    throw new ValidationError("unsupported_upload_type", `Unsupported upload type: ${extension || "unknown"}.`, {
      extension: extension || "unknown",
      allowedExtensions: Array.from(allowedUploadTypes.keys())
    }, 415);
  }
  if (!file.data.length) {
    throw new ValidationError("empty_upload", "Uploaded file is empty.", { field: "file" });
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

function fileRequiresAdminAccess(record) {
  return String(record?.category || "").toLowerCase() === "knowledge";
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
    filters.assignee = currentAssignmentName(user);
  }
  return filters;
}

async function activePublicUsers() {
  return (await store.listAuthUsers())
    .filter((user) => user?.active !== false)
    .map(publicUser);
}

async function validateTicketAssignee(payload) {
  if (!isPlainObject(payload) || !Object.hasOwn(payload, "assignee")) return;
  const assignee = String(payload.assignee ?? "").trim();
  if (!assignee) return;
  const directory = await assignableUsersDirectory();
  if (directory.names.has(normalizeAssignmentName(assignee))) return;
  throw new ValidationError("invalid_ticket_assignee", "Ticket assignee must be an active RepOS user.", {
    field: "assignee",
    assignee,
    allowedAssignees: directory.allowed
  });
}

async function assignableUsersDirectory() {
  const names = new Set();
  const allowed = [];
  const add = (name) => {
    const clean = String(name || "").trim();
    const normalized = normalizeAssignmentName(clean);
    if (!normalized || names.has(normalized)) return;
    names.add(normalized);
    allowed.push(clean);
  };

  const legacyUsers = await store.getResource("users");
  const legacyAssignableNames = [];
  const legacyBlockedNames = new Set();
  if (Array.isArray(legacyUsers)) {
    for (const user of legacyUsers) {
      const clean = String(user?.name || user?.displayName || "").trim();
      const normalized = normalizeAssignmentName(clean);
      if (!normalized) continue;
      if (user.removed === true || user.assignmentEligible === false) {
        legacyBlockedNames.add(normalized);
      } else {
        legacyAssignableNames.push(clean);
      }
    }
  }

  legacyAssignableNames.forEach(add);

  const addAuthUserName = (name) => {
    if (legacyBlockedNames.has(normalizeAssignmentName(name))) return;
    add(name);
  };

  for (const user of await store.listAuthUsers()) {
    if (user?.active === false) continue;
    addAuthUserName(user.repName);
    addAuthUserName(user.displayName);
  }

  return { names, allowed: allowed.sort((a, b) => a.localeCompare(b)) };
}

function normalizeAssignmentName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function analyticsOptionsFromSearch(searchParams) {
  const rawWindowHours = searchParams.get("windowHours");
  const rawLimit = searchParams.get("limit");
  const windowHours = rawWindowHours === null ? 24 : Number(rawWindowHours);
  const limit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > 720) {
    return {
      ok: false,
      error: {
        error: "invalid_analytics_query",
        message: "windowHours must be an integer from 1 to 720.",
        details: { field: "windowHours" }
      }
    };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return {
      ok: false,
      error: {
        error: "invalid_analytics_query",
        message: "limit must be an integer from 1 to 100.",
        details: { field: "limit" }
      }
    };
  }
  return { ok: true, value: { windowHours, limit } };
}

function isValidCustomerLookupEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function defaultWorkspaceSettings() {
  return {
    workspaceName: "iSpring Water Systems",
    workspaceLabel: "Workspace: iSpring Water Systems",
    supportEmail: "support@ispringfilters.com",
    currentUserName: "Morgan Lee",
    currentUserRole: "admin",
    defaultAssignee: "Morgan Lee",
    timezone: "America/New_York",
    demoMode: true,
    defaultSlaHours: 48,
    overdueGraceHours: 0,
    allowedStatuses: ["Open", "Closed, Waiting On Response", "Closed"]
  };
}

async function workspaceSettings() {
  return normalizeWorkspaceSettings(await store.getResource("settings"));
}

async function ensureConfiguredAuthUser(settings = null) {
  const currentSettings = settings || await workspaceSettings();
  const defaultUser = await store.ensureAuthUser(defaultAuthUser(currentSettings));
  const productionUser = await configuredProductionAuthUser(currentSettings);
  if (productionUser) await store.ensureAuthUser(productionUser);
  return defaultUser;
}

async function configuredProductionAuthUser(settings = null) {
  if (!productionAdminConfigured) return null;
  const existing = await store.findAuthUserByEmail(productionAdminEmail);
  const passwordHash = productionAdminPasswordHash ||
    (existing?.passwordHash && verifyPassword(productionAdminPassword, existing.passwordHash)
      ? existing.passwordHash
      : hashPassword(productionAdminPassword));
  const displayName = cleanSettingText(
    process.env.REPOS_ADMIN_NAME || process.env.TESSARIO_ADMIN_NAME || existing?.displayName || existing?.repName,
    "RepOS Admin",
    80
  );
  return {
    ...(existing || {}),
    id: existing?.id || process.env.REPOS_ADMIN_ID || authUserIdFromEmail(productionAdminEmail),
    email: productionAdminEmail,
    displayName,
    repName: displayName,
    role: productionAdminRole,
    active: true,
    passwordHash
  };
}

function authUserIdFromEmail(email) {
  return String(email || "repos-admin")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "repos-admin";
}

function ticketResultWithSla(result, settings) {
  return result?.ticket
    ? { ...result, ticket: withTicketSla(result.ticket, settings) }
    : result;
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
    defaultSlaHours: normalizeSettingsInteger(source.defaultSlaHours, defaults.defaultSlaHours, 1, 720),
    overdueGraceHours: normalizeSettingsInteger(source.overdueGraceHours, defaults.overdueGraceHours, 0, 168),
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
    } else if (key === "defaultSlaHours") {
      const value = strictSettingsInteger(raw, 1, 720);
      if (value === null) return invalidSetting(key, "defaultSlaHours must be an integer from 1 to 720.");
      next.defaultSlaHours = value;
    } else if (key === "overdueGraceHours") {
      const value = strictSettingsInteger(raw, 0, 168);
      if (value === null) return invalidSetting(key, "overdueGraceHours must be an integer from 0 to 168.");
      next.overdueGraceHours = value;
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
  return normalizeAuthRole(value, fallback);
}

function normalizeAuthRole(value, fallback) {
  const role = String(value || "").trim().toLowerCase();
  return ["admin", "manager", "rep", "owner"].includes(role) ? role : fallback;
}

function normalizeSettingsInteger(value, fallback, min, max) {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return fallback;
  return number;
}

function strictSettingsInteger(value, min, max) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^-?\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
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
  if (!userHasRole(user, roles)) {
    sendJson(response, 403, { error: "insufficient_role", required: roles });
    return null;
  }
  return user;
}

async function requireAdmin(request, response) {
  return requireRole(request, response, adminRoles);
}

function userHasRole(user, roles) {
  return roles.includes(String(user?.role || "").toLowerCase());
}

function currentAssignmentName(user) {
  return String(user?.repName || user?.displayName || user?.email || "").trim();
}

function userWithAssignmentName(user) {
  return { ...user, assignmentName: currentAssignmentName(user) };
}

async function getCurrentUser(request, response) {
  const token = sessionTokenFromCookie(parseCookies(request.headers.cookie || "")[sessionCookieName]);
  if (token) {
    const result = await store.getAuthSession(token);
    if (result?.user) return result.user;
  }
  if (!automaticSessionAuthEnabled) return null;
  const user = await store.ensureAuthUser(defaultAuthUser());
  await createSessionForUser(response, user);
  return user;
}

async function createSessionForUser(response, user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  const session = await store.createAuthSession(user.id, { token, expiresAt });
  setCookie(response, sessionCookie(cookieValueForSessionToken(token), expiresAt));
  return session;
}

function defaultAuthUser(settings = defaultWorkspaceSettings()) {
  const currentSettings = normalizeWorkspaceSettings(settings);
  return {
    id: "morgan-lee",
    email: "morgan.lee@demo.repos",
    displayName: currentSettings.currentUserName,
    repName: currentSettings.currentUserName,
    role: currentSettings.currentUserRole,
    active: true
  };
}

function publicUser(user) {
  const assignmentName = currentAssignmentName(user);
  return {
    id: user.id,
    email: user.email,
    name: assignmentName,
    displayName: user.displayName,
    repName: user.repName,
    assignmentName,
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

function sessionTokenFromCookie(value) {
  if (!value) return "";
  const token = String(value);
  if (!sessionSecretConfigured) return token;
  const separator = token.lastIndexOf(".");
  if (separator === -1) return "";
  const rawToken = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = signSessionToken(rawToken);
  if (!constantTimeEqual(signature, expected)) return "";
  return rawToken;
}

function cookieValueForSessionToken(token) {
  return sessionSecretConfigured ? `${token}.${signSessionToken(token)}` : token;
}

function signSessionToken(token) {
  return createHmac("sha256", sessionSecret).update(String(token)).digest("base64url");
}

function signSsoStateCookie(value) {
  return createHmac("sha256", ssoStateSecret).update(String(value)).digest("base64url");
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionCookie(value, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${sessionCookieName}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Expires=${new Date(expiresAt).toUTCString()}${secureSessionCookies ? "; Secure" : ""}`;
}

function expiredSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureSessionCookies ? "; Secure" : ""}`;
}

function ssoStateCookie(value) {
  const body = Buffer.from(JSON.stringify({ ...value, createdAt: Date.now() }), "utf8").toString("base64url");
  const signed = `${body}.${signSsoStateCookie(body)}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  return `${ssoStateCookieName}=${encodeURIComponent(signed)}; Path=/api/auth/sso; HttpOnly; SameSite=Lax; Max-Age=600; Expires=${expiresAt.toUTCString()}${secureSessionCookies ? "; Secure" : ""}`;
}

function ssoStateFromCookie(value) {
  if (!value) return null;
  const cookieValue = String(value);
  const separator = cookieValue.lastIndexOf(".");
  if (separator === -1) return null;
  const body = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!constantTimeEqual(signature, signSsoStateCookie(body))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!isPlainObject(parsed) || Date.now() - Number(parsed.createdAt || 0) > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function expiredSsoStateCookie() {
  return `${ssoStateCookieName}=; Path=/api/auth/sso; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureSessionCookies ? "; Secure" : ""}`;
}

function setCookie(response, cookie) {
  response.__tessarioHeaders = response.__tessarioHeaders || {};
  const existing = response.__tessarioHeaders["Set-Cookie"];
  response.__tessarioHeaders["Set-Cookie"] = existing ? [...existing, cookie] : [cookie];
}

function pendingHeaders(response) {
  return response.__tessarioHeaders || {};
}

function redirect(response, location, status = 302) {
  response.writeHead(status, {
    Location: location,
    "Cache-Control": "no-store",
    ...pendingHeaders(response)
  });
  response.end();
}
