import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile("app.js", "utf8");
const helperSource = [
  "hydrateBackendState",
  "isBackendPlainObject",
  "sessionUserAssignmentName",
  "sessionUserRole",
  "applySessionUserToWorkspace",
  "profileDisplayName",
  "currentDemoUserName",
  "currentDemoUserRole",
  "currentAssignmentUser",
  "assignedToCurrentDemoUser",
  "currentUserIsAdmin",
  "currentUserCanUseMacros"
].map((name) => extractFunction(appSource, name)).join("\n\n");

function extractFunction(source, name) {
  let start = source.indexOf(`async function ${name}(`);
  if (start === -1) start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Could not locate ${name} in app.js.`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name} from app.js.`);
}

function createHarness(fetchPayload = null) {
  const fetchCalls = [];
  const storage = new Map();
  const renderCalls = [];
  const warnings = [];
  const context = {
    CURRENT_USER: "CS14 Robert",
    MIN_TICKET_NUMBER: 1000,
    STORAGE_KEY: "tickets",
    USERS_STORAGE_KEY: "users",
    PROFILE_STORAGE_KEY: "profile",
    SETTINGS_STORAGE_KEY: "settings",
    NOTIFICATIONS_STORAGE_KEY: "notifications",
    KNOWLEDGE_STORAGE_KEY: "knowledge",
    PRODUCT_LINK_STORAGE_KEY: "productLinks",
    CUSTOMER_ACCOUNTS_STORAGE_KEY: "customerAccounts",
    TICKET_COUNTER_STORAGE_KEY: "ticketCounter",
    backendSyncReady: false,
    backendSyncAvailable: false,
    backendSyncQueue: new Map(),
    sessionUser: null,
    workspaceSettings: {
      currentUserName: "CS14 Robert",
      currentUserRole: "admin",
      defaultAssignee: "CS14 Robert"
    },
    profile: { displayName: "CS14 Robert", role: "Admin" },
    users: [
      { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
      { id: "cs1-nick", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false }
    ],
    tickets: [
      { id: "NICK-1", assignee: "CS1 Nick" },
      { id: "ROBERT-1", assignee: "CS14 Robert" }
    ],
    notifications: [],
    knowledgeDocs: [],
    productLinks: [],
    customerAccounts: {},
    lastUsedTicketNumber: 1000,
    selectedTicketId: "",
    localStorage: {
      setItem(key, value) {
        storage.set(key, value);
      }
    },
    window: {
      fetch: true
    },
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    fetch: async (url, options = {}) => {
      fetchCalls.push({ url, method: options.method || "GET", body: options.body || "" });
      if (url !== "/api/bootstrap") {
        throw new Error(`Unexpected fetch during frontend multi-user smoke: ${url}`);
      }
      return {
        ok: true,
        status: 200,
        json: async () => fetchPayload || {}
      };
    },
    normalizeRepName(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    },
    normalizeWorkspaceSettings(value = {}) {
      return {
        currentUserName: context.normalizeRepName(value.currentUserName) || "CS14 Robert",
        currentUserRole: ["admin", "manager", "rep", "owner"].includes(String(value.currentUserRole || "").toLowerCase())
          ? String(value.currentUserRole).toLowerCase()
          : "rep",
        defaultAssignee: context.normalizeRepName(value.defaultAssignee || value.currentUserName) || "CS14 Robert"
      };
    },
    applyWorkspaceSettings() {},
    applyWorkspaceBranding() {},
    applyProfilePreferences() {},
    render(options) {
      renderCalls.push(options || {});
    },
    hasValidTicketData() {
      return false;
    },
    normalizeTickets(value) {
      return value;
    },
    rebaselineOpenTicketSla() {},
    normalizeCustomerAccounts(value) {
      return value;
    },
    highestExistingTicketNumber() {
      return 1000;
    },
    syncBackendSnapshot() {
      throw new Error("Bootstrap hydration must not write back state.");
    }
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context, { filename: "app.js#frontend-multi-user-helpers" });
  return { context, fetchCalls, renderCalls, storage, warnings };
}

{
  const { context } = createHarness();
  for (const [user, expected] of [
    [{ assignmentName: "CS9 Assigned", repName: "CS1 Nick", name: "Named User", displayName: "Display User", email: "email@example.com" }, "CS9 Assigned"],
    [{ repName: "CS1 Nick", name: "Named User", displayName: "Display User", email: "email@example.com" }, "CS1 Nick"],
    [{ name: "Named User", displayName: "Display User", email: "email@example.com" }, "Named User"],
    [{ displayName: "Display User", email: "email@example.com" }, "Display User"],
    [{ email: "email@example.com" }, "email@example.com"]
  ]) {
    context.sessionUser = user;
    assert.equal(context.sessionUserAssignmentName(), expected, "session identity should use the expected precedence");
  }
}

{
  const payload = {
    session: {
      user: {
        id: "cs1-nick",
        email: "nick@example.com",
        assignmentName: "CS1 Nick",
        repName: "CS1 Nick",
        displayName: "Nick Lawrence",
        role: "rep",
        active: true
      }
    },
    state: {
      settings: {
        currentUserName: "CS14 Robert",
        currentUserRole: "admin",
        defaultAssignee: "CS14 Robert"
      }
    }
  };
  const { context, fetchCalls, renderCalls } = createHarness(payload);
  await context.hydrateBackendState();

  assert.equal(context.currentDemoUserName(), "CS1 Nick", "session user should override seeded current user");
  assert.equal(context.profileDisplayName(), "CS1 Nick", "profile display should prefer hydrated session identity");
  assert.equal(context.workspaceSettings.currentUserName, "CS1 Nick", "workspace compatibility name should be patched from session");
  assert.equal(context.workspaceSettings.defaultAssignee, "CS1 Nick", "default assignee should follow session identity");
  assert.equal(context.currentDemoUserRole(), "rep", "role helper should prefer hydrated session role");
  assert.equal(context.currentUserIsAdmin(), false, "rep session should not inherit stale admin settings");
  assert.equal(context.currentUserCanUseMacros(), false, "rep session should not be able to use macros");
  assert.equal(context.assignedToCurrentDemoUser({ assignee: "CS1 Nick" }), true, "Assigned To Me should match session identity");
  assert.equal(context.assignedToCurrentDemoUser({ assignee: "CS14 Robert" }), false, "Assigned To Me should not match fallback user after session hydration");
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/bootstrap"]], "bootstrap should not trigger state write-back fetches");
  assert.equal(renderCalls.length, 1, "session hydration should render once when compatibility settings change");
}

for (const role of ["admin", "owner", "manager", "rep"]) {
  const { context } = createHarness();
  context.sessionUser = { assignmentName: "Role User", role };
  assert.equal(context.currentDemoUserRole(), role);
  assert.equal(context.currentUserIsAdmin(), ["admin", "owner"].includes(role), `${role} admin gate mismatch`);
  assert.equal(context.currentUserCanUseMacros(), ["admin", "owner"].includes(role), `${role} macro gate mismatch`);
}

{
  const { context, fetchCalls } = createHarness({ session: {}, state: {} });
  context.sessionUser = null;
  context.workspaceSettings = {
    currentUserName: "Manager Maya",
    currentUserRole: "manager",
    defaultAssignee: "Manager Maya"
  };
  context.profile = { displayName: "Local Profile", role: "Manager" };

  assert.equal(context.applySessionUserToWorkspace(), false, "missing session user should not mutate settings");
  assert.equal(context.currentDemoUserName(), "Manager Maya", "fallback should use workspace current user");
  assert.equal(context.profileDisplayName(), "Local Profile", "fallback should preserve local profile display name");
  assert.equal(context.currentUserIsAdmin(), false, "manager fallback should not be admin");
  assert.equal(context.assignedToCurrentDemoUser({ assignee: "Manager Maya" }), true);

  await context.hydrateBackendState();
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/bootstrap"]]);
}

console.log("Frontend multi-user smoke test passed.");
