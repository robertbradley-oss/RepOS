import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const port = 4199;
const dataDir = await mkdtemp(join(tmpdir(), "tessario-smoke-"));
const dataFile = join(dataDir, "state.json");
const uploadDir = join(dataDir, "uploads");
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    TESSARIO_DATA_FILE: dataFile,
    TESSARIO_UPLOAD_DIR: uploadDir
  },
  stdio: "pipe"
});

try {
  await waitForHealth(port);

  const session = await fetch(`http://127.0.0.1:${port}/api/session`);
  const sessionPayload = await session.json();
  if (!sessionPayload.authenticated || sessionPayload.user?.role !== "admin") {
    throw new Error("Development session did not auto-authenticate as admin.");
  }

  const users = await fetch(`http://127.0.0.1:${port}/api/auth/users`);
  if (!users.ok) throw new Error(`Admin auth users route failed: ${users.status}`);

  const profile = { displayName: "Smoke Test", role: "Admin" };
  const update = await fetch(`http://127.0.0.1:${port}/api/state/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });
  if (!update.ok) throw new Error(`Profile update failed: ${update.status}`);

  const read = await fetch(`http://127.0.0.1:${port}/api/state/profile`);
  const payload = await read.json();
  if (payload.value?.displayName !== profile.displayName) {
    throw new Error("Profile readback did not match written value.");
  }

  const settingsRead = await fetch(`http://127.0.0.1:${port}/api/settings`);
  const settingsPayload = await settingsRead.json();
  if (!settingsRead.ok || settingsPayload.settings?.workspaceName !== "iSpring Water Systems" || settingsPayload.settings?.currentUserName !== "CS14 Robert") {
    throw new Error("Settings read did not return the expected iSpring workspace defaults.");
  }

  const bootstrap = await fetch(`http://127.0.0.1:${port}/api/bootstrap`);
  const bootstrapPayload = await bootstrap.json();
  if (
    !bootstrap.ok ||
    bootstrapPayload.session?.user?.role !== "admin" ||
    bootstrapPayload.state?.settings?.workspaceName !== "iSpring Water Systems" ||
    !Object.hasOwn(bootstrapPayload.state || {}, "knowledgeDocs") ||
    !Object.hasOwn(bootstrapPayload.state || {}, "fileRecords")
  ) {
    throw new Error("Admin bootstrap did not return the expected session and full workspace state.");
  }

  const settingsPatch = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supportEmail: "smoke-support@ispringfilters.com",
      timezone: "America/New_York",
      demoMode: true,
      defaultSlaHours: 48,
      overdueGraceHours: 0
    })
  });
  const settingsPatchPayload = await settingsPatch.json();
  if (
    !settingsPatch.ok ||
    settingsPatchPayload.settings?.supportEmail !== "smoke-support@ispringfilters.com" ||
    settingsPatchPayload.settings?.defaultSlaHours !== 48 ||
    settingsPatchPayload.settings?.overdueGraceHours !== 0
  ) {
    throw new Error(`Settings patch failed: ${settingsPatch.status}`);
  }

  const invalidSettingsField = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unsupportedSetting: true })
  });
  const invalidSettingsFieldPayload = await invalidSettingsField.json();
  if (invalidSettingsField.status !== 400 || invalidSettingsFieldPayload.error !== "unsupported_settings_fields") {
    throw new Error("Invalid settings field did not return the expected JSON error.");
  }

  const invalidSettingsEmail = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supportEmail: "not-an-email" })
  });
  const invalidSettingsEmailPayload = await invalidSettingsEmail.json();
  if (invalidSettingsEmail.status !== 400 || invalidSettingsEmailPayload.error !== "invalid_settings_value") {
    throw new Error("Invalid settings email did not return the expected JSON error.");
  }

  const invalidSettingsSla = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultSlaHours: 0 })
  });
  const invalidSettingsSlaPayload = await invalidSettingsSla.json();
  if (invalidSettingsSla.status !== 400 || invalidSettingsSlaPayload.error !== "invalid_settings_value") {
    throw new Error("Invalid SLA settings did not return the expected JSON error.");
  }

  const invalidSettingsStatus = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allowedStatuses: ["Open", "Escalated"] })
  });
  const invalidSettingsStatusPayload = await invalidSettingsStatus.json();
  if (invalidSettingsStatus.status !== 400 || invalidSettingsStatusPayload.error !== "invalid_settings_value") {
    throw new Error("Invalid allowedStatuses did not return the expected JSON error.");
  }

  const ticketInput = {
    id: "SMOKE-1",
    subject: "Smoke test ticket",
    status: "Open",
    customer: {
      name: "Smoke Customer",
      email: "smoke@example.com"
    },
    conversation: []
  };
  const created = await fetch(`http://127.0.0.1:${port}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketInput)
  });
  if (created.status !== 201) throw new Error(`Ticket create failed: ${created.status}`);

  const listed = await fetch(`http://127.0.0.1:${port}/api/tickets?assignee=me`);
  const listedPayload = await listed.json();
  if (!listed.ok || !listedPayload.tickets?.some((ticket) => ticket.id === "SMOKE-1")) {
    throw new Error("Ticket list with assignee=me did not include the smoke ticket.");
  }

  const patched = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Closed" })
  });
  if (!patched.ok) throw new Error(`Ticket patch failed: ${patched.status}`);
  const patchedPayload = await patched.json();
  if (!patchedPayload.ticket?.conversation?.some((message) => /closed this ticket/i.test(message.body || ""))) {
    throw new Error("Ticket status patch did not create a close activity entry.");
  }

  const invalidPatch = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation: [] })
  });
  if (invalidPatch.status !== 400) {
    throw new Error(`Invalid ticket patch should return 400, got ${invalidPatch.status}.`);
  }

  const note = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author: "Smoke Test", body: "Backend note route works." })
  });
  if (note.status !== 201) throw new Error(`Ticket note failed: ${note.status}`);
  const notePayload = await note.json();
  if (!notePayload.message?.internal || notePayload.message?.type !== "note") {
    throw new Error("Ticket note did not persist as an internal note.");
  }

  const reply = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: "Backend customer-facing reply route works." })
  });
  if (reply.status !== 201) throw new Error(`Ticket reply failed: ${reply.status}`);
  const replyPayload = await reply.json();
  if (replyPayload.message?.type !== "rep" || replyPayload.message?.internal) {
    throw new Error("Ticket reply did not persist as a customer-facing rep message.");
  }

  const attachment = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "smoke-photo.png", mimeType: "image/png", sizeBytes: 42 })
  });
  if (attachment.status !== 201) throw new Error(`Ticket attachment metadata failed: ${attachment.status}`);

  const ticketRead = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1`);
  const ticketPayload = await ticketRead.json();
  if (ticketPayload.ticket?.status !== "Closed" || ticketPayload.ticket?.conversation?.length < 5 || ticketPayload.ticket?.attachments?.length !== 1) {
    throw new Error("Ticket normalized API readback did not match expected state.");
  }
  if (ticketPayload.ticket?.slaStatus !== "closed" || ticketPayload.ticket?.isOverdue !== false || !ticketPayload.ticket?.dueAt) {
    throw new Error("Ticket API readback did not include expected derived SLA fields.");
  }

  const customerInput = {
    email: "smoke@example.com",
    name: "Smoke Customer",
    phone: "555-0000",
    purchaseSource: "iSpring direct"
  };
  const customerCreated = await fetch(`http://127.0.0.1:${port}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerInput)
  });
  if (customerCreated.status !== 201) throw new Error(`Customer create failed: ${customerCreated.status}`);

  const customerByEmail = await fetch(`http://127.0.0.1:${port}/api/customers/by-email/Smoke%40Example.com`);
  const customerByEmailPayload = await customerByEmail.json();
  if (!customerByEmail.ok || customerByEmailPayload.customer?.email !== "smoke@example.com") {
    throw new Error("Customer by-email lookup did not return the normalized smoke customer.");
  }

  const invalidCustomerByEmail = await fetch(`http://127.0.0.1:${port}/api/customers/by-email/not-an-email`);
  if (invalidCustomerByEmail.status !== 400) {
    throw new Error(`Invalid customer by-email lookup should return 400, got ${invalidCustomerByEmail.status}.`);
  }

  const customerSearch = await fetch(`http://127.0.0.1:${port}/api/customers?search=SMOKE`);
  const customerSearchPayload = await customerSearch.json();
  if (!customerSearch.ok || !customerSearchPayload.customers?.some((customer) => customer.email === "smoke@example.com")) {
    throw new Error("Customer list search did not find the smoke customer.");
  }

  const now = Date.now();
  const dueSoonAt = new Date(now + 2 * 60 * 60 * 1000).toISOString();
  const overdueAt = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  const normalDueAt = new Date(now + 36 * 60 * 60 * 1000).toISOString();
  const fallbackTicketSync = await fetch(`http://127.0.0.1:${port}/api/state/tickets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      stripDerivedSlaFields(ticketPayload.ticket, { stripDerivedDueAt: true }),
      {
        id: "SMOKE-CUSTOMEREMAIL",
        subject: "Smoke customerEmail linking",
        status: "Open",
        assignee: "CS14 Robert",
        customerEmail: "Smoke@Example.com",
        dueAt: dueSoonAt
      },
      {
        id: "SMOKE-TOPLEVEL-EMAIL",
        subject: "Smoke top-level email linking",
        status: "Open",
        email: "smoke@example.com",
        dueAt: overdueAt
      },
      {
        id: "SMOKE-PENDING",
        subject: "Smoke pending queue",
        status: "Closed, Waiting On Response",
        assignee: "CS14 Robert",
        customerEmail: "pending@example.com",
        dueAt: normalDueAt
      }
    ])
  });
  if (!fallbackTicketSync.ok) throw new Error(`Fallback ticket sync failed: ${fallbackTicketSync.status}`);

  const queueViewSync = await fetch(`http://127.0.0.1:${port}/api/state/queueViews`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      { id: "open", label: "Open", title: "Open Tickets", filters: { statusGroup: "open" } },
      { id: "assigned", label: "Assigned To Me", title: "Assigned To Me", filters: { statusGroup: "open", assignee: "current" } },
      { id: "closed", label: "Closed", title: "Closed Tickets", filters: { statusGroup: "closed-display" } },
      { id: "pending", label: "Pending", title: "Pending Tickets", filters: { statusGroup: "pending" } }
    ])
  });
  if (!queueViewSync.ok) throw new Error(`Queue view state sync failed: ${queueViewSync.status}`);

  const queueViews = await fetch(`http://127.0.0.1:${port}/api/queue-views`);
  const queueViewsPayload = await queueViews.json();
  const queueViewIds = new Set((queueViewsPayload.queueViews || []).map((view) => view.id));
  if (!queueViews.ok || !["open", "assigned", "closed", "pending"].every((id) => queueViewIds.has(id))) {
    throw new Error("Queue view list did not include expected default views.");
  }

  const openQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets`);
  const openQueuePayload = await openQueue.json();
  if (!openQueue.ok || openQueuePayload.total !== 2 || openQueuePayload.tickets?.some((ticket) => ticket.status !== "Open")) {
    throw new Error("Open queue view did not return the expected open tickets.");
  }
  if (!openQueuePayload.tickets?.every((ticket) => ticket.dueAt && ["due-soon", "overdue"].includes(ticket.slaStatus))) {
    throw new Error("Open queue view tickets did not include expected derived SLA fields.");
  }

  const assignedQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/assigned/tickets`);
  const assignedQueuePayload = await assignedQueue.json();
  if (!assignedQueue.ok || assignedQueuePayload.total !== 1 || assignedQueuePayload.tickets?.[0]?.id !== "SMOKE-CUSTOMEREMAIL") {
    throw new Error("Assigned To Me queue view did not use the configured current user.");
  }

  const closedQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/closed/tickets`);
  const closedQueuePayload = await closedQueue.json();
  const closedIds = new Set((closedQueuePayload.tickets || []).map((ticket) => ticket.id));
  if (!closedQueue.ok || closedQueuePayload.total !== 2 || !["SMOKE-1", "SMOKE-PENDING"].every((id) => closedIds.has(id))) {
    throw new Error("Closed queue view did not preserve current closed-tab status behavior.");
  }

  const pendingQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/pending/tickets`);
  const pendingQueuePayload = await pendingQueue.json();
  if (!pendingQueue.ok || pendingQueuePayload.total !== 1 || pendingQueuePayload.tickets?.[0]?.id !== "SMOKE-PENDING") {
    throw new Error("Pending queue view did not return the expected pending ticket.");
  }

  const customerEmailQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets?customerEmail=Smoke%40Example.com`);
  const customerEmailQueuePayload = await customerEmailQueue.json();
  if (!customerEmailQueue.ok || customerEmailQueuePayload.total !== 2) {
    throw new Error("Queue view customerEmail filter did not find expected open customer tickets.");
  }

  const dueSoonQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets?sla=due-soon`);
  const dueSoonQueuePayload = await dueSoonQueue.json();
  if (!dueSoonQueue.ok || dueSoonQueuePayload.total !== 1 || dueSoonQueuePayload.tickets?.[0]?.id !== "SMOKE-CUSTOMEREMAIL") {
    throw new Error("Queue view SLA due-soon filter did not find the expected ticket.");
  }

  const overdueQueue = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets?sla=overdue`);
  const overdueQueuePayload = await overdueQueue.json();
  if (!overdueQueue.ok || overdueQueuePayload.total !== 1 || overdueQueuePayload.tickets?.[0]?.id !== "SMOKE-TOPLEVEL-EMAIL") {
    throw new Error("Queue view SLA overdue filter did not find the expected ticket.");
  }

  const invalidQueueView = await fetch(`http://127.0.0.1:${port}/api/queue-views/not-real/tickets`);
  const invalidQueueViewPayload = await invalidQueueView.json();
  if (invalidQueueView.status !== 404 || invalidQueueViewPayload.error !== "queue_view_not_found") {
    throw new Error("Invalid queue view did not return the expected JSON error.");
  }

  const invalidQueueFilter = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets?unsupported=true`);
  const invalidQueueFilterPayload = await invalidQueueFilter.json();
  if (invalidQueueFilter.status !== 400 || invalidQueueFilterPayload.error !== "unsupported_queue_filter") {
    throw new Error("Unsupported queue view filter did not return the expected JSON error.");
  }

  const invalidQueueSlaFilter = await fetch(`http://127.0.0.1:${port}/api/queue-views/open/tickets?sla=lateish`);
  const invalidQueueSlaFilterPayload = await invalidQueueSlaFilter.json();
  if (invalidQueueSlaFilter.status !== 400 || invalidQueueSlaFilterPayload.error !== "invalid_queue_filter") {
    throw new Error("Invalid queue SLA filter did not return the expected JSON error.");
  }

  const analytics = await fetch(`http://127.0.0.1:${port}/api/analytics/summary?windowHours=24&limit=10`);
  const analyticsPayload = await analytics.json();
  if (!analytics.ok) throw new Error(`Analytics summary failed: ${analytics.status}`);
  const metrics = analyticsPayload.summary?.metrics || {};
  if (
    metrics.totalTicketCount !== 4 ||
    metrics.openTicketCount !== 2 ||
    metrics.closedTicketCount !== 1 ||
    metrics.pendingTicketCount !== 1 ||
    metrics.overdueTicketCount !== 1 ||
    metrics.dueSoonTicketCount !== 1 ||
    metrics.assignedToCurrentUserCount !== 1 ||
    metrics.allAssignedToCurrentUserCount !== 3 ||
    metrics.recentReplyCount !== 1 ||
    metrics.recentNoteCount !== 1 ||
    metrics.recentActivityCount !== 6 ||
    metrics.ticketsUpdatedRecentlyCount !== 1
  ) {
    throw new Error(`Analytics summary metrics did not match expected smoke state: ${JSON.stringify(metrics)}`);
  }
  const activityCounts = analyticsPayload.summary?.activity?.countsByCategory || {};
  if (activityCounts.status !== 1 || activityCounts.note !== 1 || activityCounts.reply !== 1 || activityCounts.attachment !== 1) {
    throw new Error(`Analytics activity category counts did not match expected smoke state: ${JSON.stringify(activityCounts)}`);
  }

  const invalidAnalytics = await fetch(`http://127.0.0.1:${port}/api/analytics/summary?windowHours=0`);
  const invalidAnalyticsPayload = await invalidAnalytics.json();
  if (invalidAnalytics.status !== 400 || invalidAnalyticsPayload.error !== "invalid_analytics_query") {
    throw new Error("Invalid analytics query did not return the expected JSON error.");
  }

  await runTicketMergeSmoke(port);

  const customerNote = await fetch(`http://127.0.0.1:${port}/api/customers/smoke%40example.com/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rep: "Smoke Test", body: "Customer note route works." })
  });
  if (customerNote.status !== 201) throw new Error(`Customer note failed: ${customerNote.status}`);

  const customerReceipt = await fetch(`http://127.0.0.1:${port}/api/customers/smoke%40example.com/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "smoke-receipt.pdf", source: "iSpring direct", status: "Verified" })
  });
  if (customerReceipt.status !== 201) throw new Error(`Customer receipt failed: ${customerReceipt.status}`);

  const receiptForm = new FormData();
  receiptForm.append("file", new Blob(["Smoke receipt upload"], { type: "text/plain" }), "smoke-receipt.txt");
  receiptForm.append("source", "iSpring direct");
  receiptForm.append("status", "Verified");
  const receiptUpload = await fetch(`http://127.0.0.1:${port}/api/customers/smoke%40example.com/receipts/upload`, {
    method: "POST",
    body: receiptForm
  });
  if (receiptUpload.status !== 201) throw new Error(`Customer receipt upload failed: ${receiptUpload.status}`);
  const receiptUploadPayload = await receiptUpload.json();
  if (!receiptUploadPayload.file?.downloadUrl || receiptUploadPayload.record?.fileName !== "smoke-receipt.txt") {
    throw new Error("Customer receipt upload did not return expected file metadata.");
  }

  const invalidReceiptUploadType = new FormData();
  invalidReceiptUploadType.append("file", new Blob(["Smoke invalid upload"], { type: "application/octet-stream" }), "smoke-receipt.exe");
  const invalidReceiptUpload = await fetch(`http://127.0.0.1:${port}/api/customers/smoke%40example.com/receipts/upload`, {
    method: "POST",
    body: invalidReceiptUploadType
  });
  const invalidReceiptUploadPayload = await invalidReceiptUpload.json();
  if (invalidReceiptUpload.status !== 415 || invalidReceiptUploadPayload.error !== "unsupported_upload_type") {
    throw new Error("Unsupported receipt upload did not return the expected JSON error.");
  }

  const receiptDownload = await fetch(`http://127.0.0.1:${port}${receiptUploadPayload.file.downloadUrl}`);
  if (!receiptDownload.ok || await receiptDownload.text() !== "Smoke receipt upload") {
    throw new Error("Protected receipt download did not return the uploaded content.");
  }

  const customerWarranty = await fetch(`http://127.0.0.1:${port}/api/customers/smoke%40example.com/warranties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "RCC7AK", orderNumber: "SMOKE-ORDER", status: "Registered" })
  });
  if (customerWarranty.status !== 201) throw new Error(`Customer warranty failed: ${customerWarranty.status}`);

  const customerTickets = await fetch(`http://127.0.0.1:${port}/api/customers/Smoke%40Example.com/tickets`);
  const customerTicketsPayload = await customerTickets.json();
  const linkedTicketIds = new Set((customerTicketsPayload.tickets || []).map((ticket) => ticket.id));
  if (
    !customerTickets.ok ||
    customerTicketsPayload.tickets?.length !== 3 ||
    !["SMOKE-1", "SMOKE-CUSTOMEREMAIL", "SMOKE-TOPLEVEL-EMAIL"].every((id) => linkedTicketIds.has(id))
  ) {
    throw new Error("Customer ticket history route did not find the smoke ticket.");
  }

  const knowledgeForm = new FormData();
  knowledgeForm.append("file", new Blob(["Smoke knowledge upload"], { type: "text/plain" }), "smoke-knowledge.txt");
  knowledgeForm.append("category", "Policy");
  knowledgeForm.append("approvedForAi", "true");
  const knowledgeUpload = await fetch(`http://127.0.0.1:${port}/api/knowledge/files/upload`, {
    method: "POST",
    body: knowledgeForm
  });
  if (knowledgeUpload.status !== 201) throw new Error(`Knowledge upload failed: ${knowledgeUpload.status}`);
  const knowledgePayload = await knowledgeUpload.json();
  if (knowledgePayload.document?.fileName !== "smoke-knowledge.txt" || !knowledgePayload.document?.approvedForAi) {
    throw new Error("Knowledge upload did not return expected document metadata.");
  }

  const invalidKnowledgeUpload = await fetch(`http://127.0.0.1:${port}/api/knowledge/files/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "not-multipart.txt" })
  });
  const invalidKnowledgeUploadPayload = await invalidKnowledgeUpload.json();
  if (invalidKnowledgeUpload.status !== 400 || invalidKnowledgeUploadPayload.error !== "invalid_upload_request") {
    throw new Error("Invalid knowledge upload did not return the expected JSON error.");
  }

  const emptyKnowledgeForm = new FormData();
  emptyKnowledgeForm.append("file", new Blob([], { type: "text/plain" }), "empty-knowledge.txt");
  const emptyKnowledgeUpload = await fetch(`http://127.0.0.1:${port}/api/knowledge/files/upload`, {
    method: "POST",
    body: emptyKnowledgeForm
  });
  const emptyKnowledgeUploadPayload = await emptyKnowledgeUpload.json();
  if (emptyKnowledgeUpload.status !== 400 || emptyKnowledgeUploadPayload.error !== "empty_upload") {
    throw new Error("Empty knowledge upload did not return the expected JSON error.");
  }

  const knowledgeDownload = await fetch(`http://127.0.0.1:${port}${knowledgePayload.file.downloadUrl}`);
  if (!knowledgeDownload.ok || await knowledgeDownload.text() !== "Smoke knowledge upload") {
    throw new Error("Protected knowledge download did not return the uploaded content.");
  }

  const repRolePatch = await fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentUserRole: "rep" })
  });
  if (!repRolePatch.ok) throw new Error(`Rep role settings patch failed: ${repRolePatch.status}`);

  const repLogin = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "robbybradley@gmail.com" })
  });
  if (!repLogin.ok) throw new Error(`Rep dev login failed: ${repLogin.status}`);
  const repCookie = repLogin.headers.get("set-cookie")?.split(";")[0];
  if (!repCookie) throw new Error("Rep dev login did not return a session cookie.");

  const repBootstrap = await fetch(`http://127.0.0.1:${port}/api/bootstrap`, {
    headers: { Cookie: repCookie }
  });
  const repBootstrapPayload = await repBootstrap.json();
  if (!repBootstrap.ok || "knowledgeDocs" in (repBootstrapPayload.state || {}) || "fileRecords" in (repBootstrapPayload.state || {})) {
    throw new Error("Non-admin bootstrap exposed admin-only Knowledge Vault state.");
  }

  const repKnowledgeState = await fetch(`http://127.0.0.1:${port}/api/state/knowledgeDocs`, {
    headers: { Cookie: repCookie }
  });
  const repKnowledgeStatePayload = await repKnowledgeState.json();
  if (repKnowledgeState.status !== 403 || repKnowledgeStatePayload.error !== "insufficient_role") {
    throw new Error("Non-admin Knowledge Vault state read did not return the expected JSON error.");
  }

  const repKnowledgeDownload = await fetch(`http://127.0.0.1:${port}${knowledgePayload.file.downloadUrl}`, {
    headers: { Cookie: repCookie }
  });
  const repKnowledgeDownloadPayload = await repKnowledgeDownload.json();
  if (repKnowledgeDownload.status !== 403 || repKnowledgeDownloadPayload.error !== "insufficient_role") {
    throw new Error("Non-admin Knowledge Vault file download did not return the expected JSON error.");
  }

  await runPersistenceReloadSmoke(dataFile, uploadDir);
  await runStrictAuthSmoke();
  await runResetSmoke(port);
  console.log("Backend smoke test passed.");
} finally {
  server.kill();
}

function stripDerivedSlaFields(ticket, options = {}) {
  const {
    dueAt,
    isOverdue,
    isDueSoon,
    overdueByHours,
    dueLabel,
    slaStatus,
    ...rest
  } = ticket || {};
  void isOverdue;
  void isDueSoon;
  void overdueByHours;
  void dueLabel;
  void slaStatus;
  return options.stripDerivedDueAt ? rest : { ...rest, dueAt };
}

async function waitForHealth(targetPort) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${targetPort}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Server did not become healthy in time.");
}

async function runStrictAuthSmoke() {
  const strictPort = 4200;
  const strictDataDir = await mkdtemp(join(tmpdir(), "tessario-strict-smoke-"));
  const strictServer = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(strictPort),
      TESSARIO_AUTH_MODE: "strict",
      TESSARIO_DATA_FILE: join(strictDataDir, "state.json")
    },
    stdio: "pipe"
  });

  try {
    await waitForHealth(strictPort);
    const unauthenticated = await fetch(`http://127.0.0.1:${strictPort}/api/tickets`);
    if (unauthenticated.status !== 401) {
      throw new Error(`Strict mode should require auth, got ${unauthenticated.status}.`);
    }

    const unauthenticatedAnalytics = await fetch(`http://127.0.0.1:${strictPort}/api/analytics/summary`);
    if (unauthenticatedAnalytics.status !== 401) {
      throw new Error(`Strict mode should protect analytics summary, got ${unauthenticatedAnalytics.status}.`);
    }

    const unauthenticatedQueueViews = await fetch(`http://127.0.0.1:${strictPort}/api/queue-views`);
    if (unauthenticatedQueueViews.status !== 401) {
      throw new Error(`Strict mode should protect queue views, got ${unauthenticatedQueueViews.status}.`);
    }

    const unauthenticatedBootstrap = await fetch(`http://127.0.0.1:${strictPort}/api/bootstrap`);
    if (unauthenticatedBootstrap.status !== 401) {
      throw new Error(`Strict mode should protect bootstrap, got ${unauthenticatedBootstrap.status}.`);
    }

    const unauthenticatedSettingsPatch = await fetch(`http://127.0.0.1:${strictPort}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supportEmail: "strict-smoke@ispringfilters.com" })
    });
    if (unauthenticatedSettingsPatch.status !== 401) {
      throw new Error(`Strict mode should protect settings updates, got ${unauthenticatedSettingsPatch.status}.`);
    }

    const login = await fetch(`http://127.0.0.1:${strictPort}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "robbybradley@gmail.com" })
    });
    if (!login.ok) throw new Error(`Strict dev login failed: ${login.status}`);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("Strict dev login did not return a session cookie.");

    const authenticated = await fetch(`http://127.0.0.1:${strictPort}/api/tickets`, {
      headers: { Cookie: cookie }
    });
    if (!authenticated.ok) {
      throw new Error(`Strict authenticated ticket list failed: ${authenticated.status}`);
    }

    const authenticatedAnalytics = await fetch(`http://127.0.0.1:${strictPort}/api/analytics/summary`, {
      headers: { Cookie: cookie }
    });
    if (!authenticatedAnalytics.ok) {
      throw new Error(`Strict authenticated analytics summary failed: ${authenticatedAnalytics.status}`);
    }

    const authenticatedQueueViews = await fetch(`http://127.0.0.1:${strictPort}/api/queue-views`, {
      headers: { Cookie: cookie }
    });
    if (!authenticatedQueueViews.ok) {
      throw new Error(`Strict authenticated queue views failed: ${authenticatedQueueViews.status}`);
    }

    const authenticatedBootstrap = await fetch(`http://127.0.0.1:${strictPort}/api/bootstrap`, {
      headers: { Cookie: cookie }
    });
    const authenticatedBootstrapPayload = await authenticatedBootstrap.json();
    if (
      !authenticatedBootstrap.ok ||
      !authenticatedBootstrapPayload.session?.authenticated ||
      authenticatedBootstrapPayload.session?.user?.role !== "admin" ||
      authenticatedBootstrapPayload.state?.settings?.workspaceName !== "iSpring Water Systems" ||
      !Object.hasOwn(authenticatedBootstrapPayload.state || {}, "knowledgeDocs") ||
      !Object.hasOwn(authenticatedBootstrapPayload.state || {}, "fileRecords")
    ) {
      throw new Error("Strict authenticated bootstrap did not return the expected admin workspace state.");
    }
  } finally {
    strictServer.kill();
  }
}

async function runResetSmoke(targetPort) {
  const reset = await fetch(`http://127.0.0.1:${targetPort}/api/reset`, {
    method: "POST"
  });
  const resetPayload = await reset.json();
  if (!reset.ok || resetPayload.state?.settings?.workspaceName !== "iSpring Water Systems") {
    throw new Error(`Reset failed to return the default iSpring workspace state: ${reset.status}`);
  }

  const customerAfterReset = await fetch(`http://127.0.0.1:${targetPort}/api/customers/by-email/smoke%40example.com`);
  const customerAfterResetPayload = await customerAfterReset.json();
  if (customerAfterReset.status !== 404 || customerAfterResetPayload.error !== "customer_not_found") {
    throw new Error("Reset did not clear the smoke customer record.");
  }

  const customersAfterReset = await fetch(`http://127.0.0.1:${targetPort}/api/customers?search=SMOKE`);
  const customersAfterResetPayload = await customersAfterReset.json();
  if (!customersAfterReset.ok || customersAfterResetPayload.customers?.length) {
    throw new Error("Reset did not clear smoke customer list results.");
  }
}

async function runTicketMergeSmoke(targetPort) {
  const primaryInput = {
    id: "MERGE-PRIMARY",
    subject: "Merge primary smoke ticket",
    status: "Open",
    customer: {
      name: "Merge Customer",
      email: "merge-smoke@example.com"
    },
    conversation: [
      {
        id: "merge-primary-message",
        type: "customer",
        author: "Merge Customer",
        timestamp: "2026-06-22T10:00:00.000Z",
        body: "Primary thread before merge."
      }
    ],
    attachments: [
      {
        id: "merge-shared-attachment",
        fileName: "shared-proof.pdf",
        downloadUrl: "/api/files/shared-proof"
      }
    ]
  };
  const secondaryInput = {
    id: "MERGE-SECONDARY",
    subject: "Merge secondary smoke ticket",
    status: "Open",
    customer: {
      name: "Merge Customer",
      email: "merge-smoke@example.com"
    },
    conversation: [
      {
        id: "merge-secondary-message",
        type: "customer",
        author: "Merge Customer",
        timestamp: "2026-06-22T10:05:00.000Z",
        body: "Secondary thread carries serial ABC-42."
      }
    ],
    attachments: [
      {
        id: "merge-secondary-attachment",
        fileName: "secondary-proof.pdf",
        downloadUrl: "/api/files/secondary-proof"
      },
      {
        id: "merge-shared-attachment",
        fileName: "shared-proof.pdf",
        downloadUrl: "/api/files/shared-proof"
      }
    ]
  };

  for (const input of [primaryInput, secondaryInput]) {
    const created = await fetch(`http://127.0.0.1:${targetPort}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (created.status !== 201) throw new Error(`Merge smoke ticket create failed for ${input.id}: ${created.status}`);
  }

  const emptyMerge = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: [] })
  });
  const emptyMergePayload = await emptyMerge.json();
  if (emptyMerge.status !== 400 || emptyMergePayload.error !== "invalid_merge_payload") {
    throw new Error("Empty merge secondary list did not return the expected JSON error.");
  }

  const missingPrimary = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-MISSING/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: ["MERGE-SECONDARY"] })
  });
  const missingPrimaryPayload = await missingPrimary.json();
  if (missingPrimary.status !== 404 || missingPrimaryPayload.error !== "ticket_not_found") {
    throw new Error("Missing primary merge did not return the expected JSON error.");
  }

  const missingSecondary = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: ["MERGE-MISSING"] })
  });
  const missingSecondaryPayload = await missingSecondary.json();
  if (missingSecondary.status !== 404 || missingSecondaryPayload.error !== "secondary_ticket_not_found") {
    throw new Error("Missing secondary merge did not return the expected JSON error.");
  }

  const selfMerge = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: ["MERGE-PRIMARY"] })
  });
  const selfMergePayload = await selfMerge.json();
  if (selfMerge.status !== 400 || selfMergePayload.error !== "cannot_merge_ticket_into_itself") {
    throw new Error("Self merge did not return the expected JSON error.");
  }

  const duplicateMerge = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: ["MERGE-SECONDARY", "MERGE-SECONDARY"] })
  });
  const duplicateMergePayload = await duplicateMerge.json();
  if (duplicateMerge.status !== 400 || duplicateMergePayload.error !== "invalid_merge_payload") {
    throw new Error("Duplicate secondary merge did not return the expected JSON error.");
  }

  const merge = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secondaryTicketIds: ["MERGE-SECONDARY"],
      note: "Smoke merge note."
    })
  });
  const mergePayload = await merge.json();
  if (!merge.ok || mergePayload.ticket?.id !== "MERGE-PRIMARY") {
    throw new Error(`Ticket merge failed: ${merge.status}`);
  }
  if (!mergePayload.ticket?.merged || !mergePayload.ticket?.mergedFrom?.includes("MERGE-SECONDARY")) {
    throw new Error("Merged primary did not include expected merge metadata.");
  }
  if (!mergePayload.merged?.some((ticket) => ticket.id === "MERGE-SECONDARY" && ticket.mergedInto === "MERGE-PRIMARY")) {
    throw new Error("Merge response did not include expected secondary summary.");
  }
  if (!mergePayload.audit?.some((event) => event.ticketId === "MERGE-PRIMARY") || !mergePayload.audit?.some((event) => event.ticketId === "MERGE-SECONDARY")) {
    throw new Error("Merge response did not include expected audit entries.");
  }
  if (!mergePayload.ticket?.conversation?.some((message) => message.sourceTicketId === "MERGE-SECONDARY" && /ABC-42/.test(message.body || ""))) {
    throw new Error("Merged primary did not carry secondary conversation source metadata.");
  }
  if (!mergePayload.ticket?.conversation?.some((message) => message.type === "note" && /Smoke merge note/.test(message.body || ""))) {
    throw new Error("Merged primary did not include the merge note.");
  }
  if (!mergePayload.ticket?.attachments?.some((attachment) => attachment.sourceTicketId === "MERGE-SECONDARY" && attachment.fileName === "secondary-proof.pdf")) {
    throw new Error("Merged primary did not carry secondary attachment source metadata.");
  }
  if ((mergePayload.ticket?.attachments || []).filter((attachment) => attachment.id === "merge-shared-attachment").length !== 1) {
    throw new Error("Merged primary did not de-duplicate carried attachments by stable identity.");
  }

  const secondaryRead = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-SECONDARY`);
  const secondaryReadPayload = await secondaryRead.json();
  if (
    !secondaryRead.ok ||
    secondaryReadPayload.ticket?.mergedInto !== "MERGE-PRIMARY" ||
    !secondaryReadPayload.ticket?.conversation?.some((message) => message.id === "merge-secondary-message") ||
    !secondaryReadPayload.ticket?.conversation?.some((message) => /merged this ticket into/i.test(message.body || ""))
  ) {
    throw new Error("Merged secondary did not preserve original thread plus breadcrumb metadata.");
  }

  const alreadyMerged = await fetch(`http://127.0.0.1:${targetPort}/api/tickets/MERGE-PRIMARY/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secondaryTicketIds: ["MERGE-SECONDARY"] })
  });
  const alreadyMergedPayload = await alreadyMerged.json();
  if (alreadyMerged.status !== 409 || alreadyMergedPayload.error !== "ticket_already_merged") {
    throw new Error("Already merged secondary did not return the expected JSON error.");
  }

  const listed = await fetch(`http://127.0.0.1:${targetPort}/api/tickets?search=ABC-42`);
  const listedPayload = await listed.json();
  const listedIds = new Set((listedPayload.tickets || []).map((ticket) => ticket.id));
  if (!listed.ok || !listedIds.has("MERGE-PRIMARY") || listedIds.has("MERGE-SECONDARY")) {
    throw new Error("Ticket list did not hide merged secondary while keeping carried secondary search context.");
  }

  const listedWithMerged = await fetch(`http://127.0.0.1:${targetPort}/api/tickets?includeMerged=true&search=ABC-42`);
  const listedWithMergedPayload = await listedWithMerged.json();
  const listedWithMergedIds = new Set((listedWithMergedPayload.tickets || []).map((ticket) => ticket.id));
  if (!listedWithMerged.ok || !listedWithMergedIds.has("MERGE-PRIMARY") || !listedWithMergedIds.has("MERGE-SECONDARY")) {
    throw new Error("Ticket list includeMerged flag did not expose merged secondary tickets.");
  }

  const openQueue = await fetch(`http://127.0.0.1:${targetPort}/api/queue-views/open/tickets`);
  const openQueuePayload = await openQueue.json();
  const openQueueIds = new Set((openQueuePayload.tickets || []).map((ticket) => ticket.id));
  if (!openQueue.ok || !openQueueIds.has("MERGE-PRIMARY") || openQueueIds.has("MERGE-SECONDARY")) {
    throw new Error("Open queue did not hide merged secondary tickets by default.");
  }

  const openQueueWithMerged = await fetch(`http://127.0.0.1:${targetPort}/api/queue-views/open/tickets?includeMerged=true`);
  const openQueueWithMergedPayload = await openQueueWithMerged.json();
  const openQueueWithMergedIds = new Set((openQueueWithMergedPayload.tickets || []).map((ticket) => ticket.id));
  if (!openQueueWithMerged.ok || !openQueueWithMergedIds.has("MERGE-PRIMARY") || !openQueueWithMergedIds.has("MERGE-SECONDARY")) {
    throw new Error("Open queue includeMerged flag did not expose merged secondary tickets.");
  }

  const analytics = await fetch(`http://127.0.0.1:${targetPort}/api/analytics/summary?windowHours=24&limit=20`);
  const analyticsPayload = await analytics.json();
  const metrics = analyticsPayload.summary?.metrics || {};
  if (!analytics.ok || metrics.totalTicketCount !== 5 || metrics.openTicketCount !== 3) {
    throw new Error(`Merge-aware analytics did not exclude merged secondary tickets: ${JSON.stringify(metrics)}`);
  }
}

async function runPersistenceReloadSmoke(existingDataFile, existingUploadDir) {
  const reloadPort = 4201;
  const reloadServer = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(reloadPort),
      TESSARIO_DATA_FILE: existingDataFile,
      TESSARIO_UPLOAD_DIR: existingUploadDir
    },
    stdio: "pipe"
  });

  try {
    await waitForHealth(reloadPort);
    const ticketRead = await fetch(`http://127.0.0.1:${reloadPort}/api/tickets/SMOKE-1`);
    const ticketPayload = await ticketRead.json();
    if (ticketPayload.ticket?.status !== "Closed" || ticketPayload.ticket?.attachments?.[0]?.fileName !== "smoke-photo.png") {
      throw new Error("Reloaded server did not read persisted ticket workflow state.");
    }
    const settingsRead = await fetch(`http://127.0.0.1:${reloadPort}/api/settings`);
    const settingsPayload = await settingsRead.json();
    if (!settingsRead.ok || settingsPayload.settings?.supportEmail !== "smoke-support@ispringfilters.com") {
      throw new Error("Reloaded server did not read persisted workspace settings.");
    }
    const analytics = await fetch(`http://127.0.0.1:${reloadPort}/api/analytics/summary`);
    const analyticsPayload = await analytics.json();
    if (!analytics.ok || analyticsPayload.summary?.metrics?.closedTicketCount !== 1) {
      throw new Error("Reloaded server did not summarize persisted analytics state.");
    }
    const queueView = await fetch(`http://127.0.0.1:${reloadPort}/api/queue-views/pending/tickets`);
    const queueViewPayload = await queueView.json();
    if (!queueView.ok || queueViewPayload.total !== 1) {
      throw new Error("Reloaded server did not summarize persisted queue view state.");
    }
  } finally {
    reloadServer.kill();
  }
}
