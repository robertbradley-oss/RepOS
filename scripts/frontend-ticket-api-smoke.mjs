import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile("app.js", "utf8");
const helperSource = extractHelperSource(appSource);

function extractHelperSource(source) {
  const start = source.indexOf("function persistTickets(");
  const end = source.indexOf("function accountForTicket(");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate frontend ticket API helper block in app.js.");
  }
  return source.slice(start, end);
}

function createHarness(fetchResponses = []) {
  const storage = new Map();
  const calls = [];
  const toasts = [];
  const warnings = [];
  const timers = [];
  const normalizeCalls = [];
  const context = {
    STORAGE_KEY: "tickets",
    BACKEND_STATE_ENDPOINT: "/api/state",
    tickets: [
      {
        id: "T-1",
        status: "Open",
        assignee: "CS1 Nick",
        aiAssignment: { assignedTo: "CS2 Julius", reason: "local optimistic assignment metadata" }
      },
      { id: "T-2", status: "Open", assignee: "CS14 Robert" }
    ],
    backendSyncReady: true,
    backendSyncAvailable: true,
    backendSyncQueue: new Map(),
    backendSyncTimer: 0,
    localStorage: {
      setItem(key, value) {
        storage.set(key, value);
      },
      getItem(key) {
        return storage.get(key) || null;
      }
    },
    window: {
      fetch: true,
      clearTimeout() {},
      setTimeout(callback, delay) {
        timers.push({ callback, delay });
        return timers.length;
      }
    },
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    showToast(message) {
      toasts.push(message);
    },
    repLabel() {
      return "CS14 Robert";
    },
    ticketById(ticketId) {
      return context.tickets.find((ticket) => String(ticket.id) === String(ticketId)) || null;
    },
    normalizeTickets(sourceTickets, options = {}) {
      normalizeCalls.push({ sourceTickets, options });
      assert.equal(options.persist, false, "backend replacement should normalize without writing a single-ticket array");
      return sourceTickets.map((ticket) => ({ ...ticket, normalizedBySmoke: true }));
    },
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, method: options.method, body });
      const next = fetchResponses.shift() || {
        ok: true,
        status: 200,
        payload: { ticket: { id: "T-1", ...body, fromBackend: true } }
      };
      return {
        ok: next.ok !== false,
        status: next.status || (next.ok === false ? 500 : 200),
        json: async () => next.payload || {}
      };
    }
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context, { filename: "app.js#ticket-api-helpers" });
  return { context, calls, storage, toasts, warnings, timers, normalizeCalls };
}

function storedTickets(harness) {
  return JSON.parse(harness.storage.get("tickets"));
}

{
  const harness = createHarness();
  harness.context.persistTicketsLocalOnly();
  assert.equal(harness.context.backendSyncQueue.size, 0, "local-only persistence should not enqueue full ticket sync");
  assert.equal(storedTickets(harness).length, 2, "local-only persistence should keep the full ticket array");
}

{
  const harness = createHarness([
    { payload: { ticket: { id: "T-1", status: "Closed", subject: "Closed by backend" } } },
    { payload: { ticket: { id: "T-1", status: "Open", subject: "Reopened by backend" } } },
    { payload: { ticket: { id: "T-1", status: "Closed, Waiting On Response", subject: "Pending by backend" } } }
  ]);
  await harness.context.syncTicketStatusToBackend("T-1", "Closed");
  await harness.context.syncTicketStatusToBackend("T-1", "Open");
  await harness.context.syncTicketStatusToBackend("T-1", "Closed, Waiting On Response");

  assert.deepEqual(harness.calls.map((call) => [call.method, call.url, call.body.status]), [
    ["PATCH", "/api/tickets/T-1", "Closed"],
    ["PATCH", "/api/tickets/T-1", "Open"],
    ["PATCH", "/api/tickets/T-1", "Closed, Waiting On Response"]
  ]);
  assert.equal(harness.context.tickets.length, 2, "status replacements must not overwrite the full ticket array");
  assert.equal(harness.context.tickets[0].status, "Closed, Waiting On Response");
}

{
  const harness = createHarness([
    { payload: { ticket: { id: "T-1", assignee: "CS5 Michelle" } } },
    { payload: { ticket: { id: "T-1", assignee: "CS5 Michelle", conversation: [{ type: "note", body: "handoff" }] } } }
  ]);
  await harness.context.syncTicketAssigneeToBackend("T-1", "CS5 Michelle", "handoff");

  assert.deepEqual(harness.calls.map((call) => [call.method, call.url]), [
    ["PATCH", "/api/tickets/T-1"],
    ["POST", "/api/tickets/T-1/notes"]
  ]);
  assert.equal(harness.calls[0].body.assignee, "CS5 Michelle");
  assert.equal(harness.calls[1].body.body, "handoff");
  assert.deepEqual(
    harness.context.tickets[0].aiAssignment,
    { assignedTo: "CS2 Julius", reason: "local optimistic assignment metadata" },
    "assignee response replacement should preserve local assignment metadata"
  );
}

{
  const harness = createHarness([{ payload: { ticket: { id: "T-1", noteSaved: true } } }]);
  await harness.context.syncTicketMessageToBackend("T-1", {
    type: "note",
    author: "CS14 Robert",
    body: "Internal note"
  });

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].url, "/api/tickets/T-1/notes");
  assert.equal(harness.calls[0].body.type, "note");
}

{
  const harness = createHarness([
    { payload: { ticket: { id: "T-1", replySaved: true } } },
    { payload: { ticket: { id: "T-1", draft: "", lastRepAt: "2026-06-20T12:00:00.000Z" } } }
  ]);
  await harness.context.syncTicketMessageToBackend("T-1", {
    type: "rep",
    author: "CS14 Robert",
    body: "Customer-facing reply"
  }, {
    draft: "",
    lastRepAt: "2026-06-20T12:00:00.000Z"
  });

  assert.deepEqual(harness.calls.map((call) => [call.method, call.url]), [
    ["POST", "/api/tickets/T-1/messages"],
    ["PATCH", "/api/tickets/T-1"]
  ]);
  assert.equal(harness.calls[0].body.type, "rep");
  assert.equal(harness.calls[1].body.draft, "");
}

{
  const harness = createHarness([{ payload: { ticket: { id: "T-1", attachments: [{ fileName: "server-only.png" }] } } }]);
  await harness.context.syncTicketAttachmentsToBackend("T-1", [{
    file: "receipt.png",
    type: "receipt",
    mimeType: "image/png",
    sizeBytes: 321,
    uploadedBy: "CS14 Robert",
    uploadedAt: "2026-06-20T12:00:00.000Z",
    status: "Attached by rep"
  }]);

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].url, "/api/tickets/T-1/attachments");
  assert.equal(harness.calls[0].body.fileName, "receipt.png");
  assert.equal(harness.context.tickets[0].attachments, undefined, "attachment helper should not replace local attachment workflow state");
}

{
  const harness = createHarness([
    { ok: false, status: 400, payload: { error: "invalid_ticket_status", message: "Invalid status" } }
  ]);
  await harness.context.syncTicketStatusToBackend("T-1", "Closed");

  assert.equal(harness.context.backendSyncQueue.get("tickets"), harness.context.tickets, "failed normalized mutation should enqueue full ticket sync fallback");
  assert.equal(harness.toasts.at(-1), "Saved locally. Backend ticket sync will retry.");
  assert.equal(harness.warnings.length, 1);
}

{
  const harness = createHarness();
  harness.context.replaceLocalTicketFromBackend({ id: "T-1", status: "Closed" });
  assert.equal(harness.context.tickets.length, 2, "single-ticket backend response must not replace the full ticket array");
  assert.equal(storedTickets(harness).length, 2, "stored tickets must remain a full ticket array");
  assert.equal(harness.normalizeCalls.at(-1).options.persist, false);
}

console.log("Frontend ticket API smoke test passed.");
