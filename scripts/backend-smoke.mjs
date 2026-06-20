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

  const fallbackTicketSync = await fetch(`http://127.0.0.1:${port}/api/state/tickets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      ticketPayload.ticket,
      {
        id: "SMOKE-CUSTOMEREMAIL",
        subject: "Smoke customerEmail linking",
        status: "Open",
        customerEmail: "Smoke@Example.com"
      },
      {
        id: "SMOKE-TOPLEVEL-EMAIL",
        subject: "Smoke top-level email linking",
        status: "Open",
        email: "smoke@example.com"
      }
    ])
  });
  if (!fallbackTicketSync.ok) throw new Error(`Fallback ticket sync failed: ${fallbackTicketSync.status}`);

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

  const knowledgeDownload = await fetch(`http://127.0.0.1:${port}${knowledgePayload.file.downloadUrl}`);
  if (!knowledgeDownload.ok || await knowledgeDownload.text() !== "Smoke knowledge upload") {
    throw new Error("Protected knowledge download did not return the uploaded content.");
  }

  await runPersistenceReloadSmoke(dataFile, uploadDir);
  await runStrictAuthSmoke();
  console.log("Backend smoke test passed.");
} finally {
  server.kill();
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
  } finally {
    strictServer.kill();
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
  } finally {
    reloadServer.kill();
  }
}
