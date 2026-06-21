import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile("app.js", "utf8");
const helperSource = [
  "hydrateBackendState",
  "hydrateBackendAssignmentUsers",
  "isBackendPlainObject",
  "backendUserToAssignmentUser",
  "sessionUserAssignmentName",
  "sessionUserRole",
  "applySessionUserToWorkspace",
  "mergedAssignmentOptionUsers",
  "activeAssignmentOptionUsers",
  "assignmentUserNameKey",
  "sameAssignmentUserName",
  "activeAssignmentUsers",
  "assignmentSelectOptions",
  "slugify",
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

function createHarness(fetchPayload = null, options = {}) {
  const bootstrapPayload = options.bootstrapPayload || fetchPayload || {};
  const backendUsersPayload = options.backendUsersPayload || { users: [] };
  const backendUsersError = options.backendUsersError || null;
  const fetchCalls = [];
  const storage = new Map();
  const renderCalls = [];
  const warnings = [];
  let persistUserCalls = 0;
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
    backendAssignmentUsers: [],
    userRoles: ["admin", "manager", "rep"],
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
      if (url === "/api/bootstrap") {
        return {
          ok: true,
          status: 200,
          json: async () => bootstrapPayload
        };
      }
      if (url === "/api/users") {
        if (backendUsersError) throw backendUsersError;
        return {
          ok: backendUsersPayload.ok !== false,
          status: backendUsersPayload.status || (backendUsersPayload.ok === false ? 500 : 200),
          json: async () => backendUsersPayload
        };
      }
      if (url.startsWith("/api/state/users")) {
        throw new Error("Backend user hydration must not write /api/state/users.");
      }
      if (String(options.method || "GET").toUpperCase() === "PUT") {
        throw new Error(`Unexpected PUT during frontend multi-user smoke: ${url}`);
      }
      {
        throw new Error(`Unexpected fetch during frontend multi-user smoke: ${url}`);
      }
    },
    persistUsers() {
      persistUserCalls += 1;
      throw new Error("Backend user hydration must not call persistUsers().");
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
    },
    escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context, { filename: "app.js#frontend-multi-user-helpers" });
  return { context, fetchCalls, renderCalls, storage, warnings, persistUserCalls: () => persistUserCalls };
}

async function flushBackendAssignmentHydration() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
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
  await flushBackendAssignmentHydration();

  assert.equal(context.currentDemoUserName(), "CS1 Nick", "session user should override seeded current user");
  assert.equal(context.profileDisplayName(), "CS1 Nick", "profile display should prefer hydrated session identity");
  assert.equal(context.workspaceSettings.currentUserName, "CS1 Nick", "workspace compatibility name should be patched from session");
  assert.equal(context.workspaceSettings.defaultAssignee, "CS1 Nick", "default assignee should follow session identity");
  assert.equal(context.currentDemoUserRole(), "rep", "role helper should prefer hydrated session role");
  assert.equal(context.currentUserIsAdmin(), false, "rep session should not inherit stale admin settings");
  assert.equal(context.currentUserCanUseMacros(), false, "rep session should not be able to use macros");
  assert.equal(context.assignedToCurrentDemoUser({ assignee: "CS1 Nick" }), true, "Assigned To Me should match session identity");
  assert.equal(context.assignedToCurrentDemoUser({ assignee: "CS14 Robert" }), false, "Assigned To Me should not match fallback user after session hydration");
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/bootstrap"], ["GET", "/api/users"]], "bootstrap should only fetch bootstrap and backend assignment users");
  assert.equal(fetchCalls.some((call) => call.method === "PUT" || call.url === "/api/state/users"), false, "backend assignment user hydration should not write state users");
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
  await flushBackendAssignmentHydration();
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/bootstrap"], ["GET", "/api/users"]]);
}

{
  const { context, fetchCalls, persistUserCalls } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "assigned-id", assignmentName: "CS9 Assigned", repName: "Wrong Name", displayName: "Wrong Display", role: "manager", active: true },
        { id: "rep-id", repName: "CS10 Rep", displayName: "Wrong Display", role: "rep", active: true },
        { id: "name-id", name: "CS11 Named", displayName: "Wrong Display", role: "owner", active: true },
        { id: "display-id", displayName: "CS12 Display", email: "display@example.com", role: "unknown", active: true },
        { id: "inactive-id", assignmentName: "CS13 Inactive", role: "rep", active: false },
        { id: "missing-name", role: "rep", active: true }
      ]
    }
  });

  const changed = await context.hydrateBackendAssignmentUsers();
  assert.equal(changed, true, "backend user hydration should report changed options");
  assert.equal(persistUserCalls(), 0, "backend user hydration should not call persistUsers");
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/users"]]);

  const merged = context.mergedAssignmentOptionUsers();
  assert(merged.some((user) => user.name === "CS9 Assigned" && user.role === "manager" && user.assignmentEligible === true && user.removed === false), "assignmentName should map to assignment shape");
  assert(merged.some((user) => user.name === "CS10 Rep" && user.role === "rep"), "repName should map when assignmentName is absent");
  assert(merged.some((user) => user.name === "CS11 Named" && user.role === "rep"), "invalid frontend role should normalize to rep");
  assert(merged.some((user) => user.name === "CS12 Display" && user.role === "rep"), "displayName should map when assignmentName/repName/name are absent");
  assert(!context.activeAssignmentOptionUsers().some((user) => user.name === "CS13 Inactive"), "inactive backend user should not be assignment eligible");
  assert(!merged.some((user) => user.id === "missing-name"), "backend users without usable names should be skipped");
}

{
  const { context } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "duplicate-nick", assignmentName: " cs1   nick ", role: "manager", active: true },
        { id: "new-backend", assignmentName: "CS6 Backend", role: "rep", active: true }
      ]
    }
  });
  context.users = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "legacy-nick", name: "CS1 Nick", role: "rep", assignmentEligible: false, removed: false }
  ];

  await context.hydrateBackendAssignmentUsers();
  const merged = context.mergedAssignmentOptionUsers();
  const nickRows = merged.filter((user) => context.sameAssignmentUserName(user.name, "CS1 Nick"));
  assert.equal(nickRows.length, 1, "legacy/backend duplicate names should collapse to one visible user");
  assert.equal(nickRows[0].id, "legacy-nick", "legacy metadata should win on duplicate assignment names");
  assert.equal(nickRows[0].assignmentEligible, false, "legacy assignment eligibility should be preserved on duplicate");
  assert(merged.some((user) => user.name === "CS6 Backend"), "backend users should fill gaps absent from legacy users");
  assert(!context.activeAssignmentOptionUsers().some((user) => user.name === "CS1 Nick"), "legacy disabled duplicate should remain disabled in option list");
  assert(context.activeAssignmentOptionUsers().some((user) => user.name === "CS6 Backend"), "new backend user should be active in option list");
}

{
  const { context } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-free-text", assignmentName: "Legacy Free Text", role: "rep", active: true }
      ]
    }
  });
  context.tickets = [
    { id: "HISTORICAL-1", assignee: "Legacy Free Text" },
    { id: "NICK-1", assignee: "CS1 Nick" }
  ];
  const beforeAssignees = context.tickets.map((ticket) => ticket.assignee);

  await context.hydrateBackendAssignmentUsers();
  assert.deepEqual(context.tickets.map((ticket) => ticket.assignee), beforeAssignees, "backend user hydration should not rewrite historical assignees");

  const freeTextOptions = context.assignmentSelectOptions("Former Rep");
  assert(freeTextOptions.includes('value="Former Rep" selected'), "current free-text assignee should be inserted and selected");
}

{
  const legacyUsers = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "legacy-only", name: "Legacy Only", role: "rep", assignmentEligible: true, removed: false }
  ];
  const { context, fetchCalls, warnings, persistUserCalls } = createHarness({
    session: {},
    state: { users: legacyUsers }
  }, {
    backendUsersPayload: { ok: false, status: 503, users: [] }
  });

  await context.hydrateBackendState();
  await flushBackendAssignmentHydration();

  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/bootstrap"], ["GET", "/api/users"]], "fallback path should still avoid state writes");
  assert.equal(fetchCalls.some((call) => call.method === "PUT" || call.url === "/api/state/users"), false, "failed backend user hydration should not write state users");
  assert.equal(persistUserCalls(), 0, "failed backend user hydration should not call persistUsers");
  assert(warnings.some((entry) => String(entry[0]).includes("backend assignment users are unavailable")), "failed /api/users should warn and fall back");
  assert.deepEqual(Array.from(context.activeAssignmentOptionUsers(), (user) => user.name), ["CS14 Robert", "Legacy Only"], "failed /api/users should fall back to legacy users only");
}

console.log("Frontend multi-user smoke test passed.");
