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
  "visibleAssignmentUsers",
  "handleAddRep",
  "toggleAssignmentEligibility",
  "removeAssignmentUser",
  "reassignTicketsFromUser",
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
  let persistTicketCalls = 0;
  let reassignTicketCalls = 0;
  const context = {
    CURRENT_USER: "Morgan Lee",
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
      currentUserName: "Morgan Lee",
      currentUserRole: "admin",
      defaultAssignee: "Morgan Lee"
    },
    profile: { displayName: "Morgan Lee", role: "Workspace Admin" },
    users: [
      { id: "morgan-lee", name: "Morgan Lee", role: "admin", assignmentEligible: true, removed: false },
      { id: "cs1-nick", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false }
    ],
    tickets: [
      { id: "NICK-1", assignee: "CS1 Nick" },
      { id: "MORGAN-1", assignee: "Morgan Lee" }
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
      fetch: true,
      alert(message) {
        throw new Error(`Unexpected alert during frontend multi-user smoke: ${message}`);
      }
    },
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    FormData: class SmokeFormData {
      constructor(target) {
        this.target = target || {};
      }

      get(name) {
        return this.target.fields?.[name] ?? this.target[name] ?? "";
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
      throw new Error("Frontend multi-user smoke did not expect persistUsers().");
    },
    persistTickets() {
      persistTicketCalls += 1;
      throw new Error("Backend-only admin user operations must not call persistTickets().");
    },
    reassignTicket() {
      reassignTicketCalls += 1;
      throw new Error("Backend-only admin user operations must not call reassignTicket().");
    },
    normalizeRepName(value) {
      return String(value || "").trim();
    },
    normalizeWorkspaceSettings(value = {}) {
      return {
        currentUserName: context.normalizeRepName(value.currentUserName) || "Morgan Lee",
        currentUserRole: ["admin", "manager", "rep", "owner"].includes(String(value.currentUserRole || "").toLowerCase())
          ? String(value.currentUserRole).toLowerCase()
          : "rep",
        defaultAssignee: context.normalizeRepName(value.defaultAssignee || value.currentUserName) || "Morgan Lee"
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
  return {
    context,
    fetchCalls,
    renderCalls,
    storage,
    warnings,
    persistUserCalls: () => persistUserCalls,
    persistTicketCalls: () => persistTicketCalls,
    reassignTicketCalls: () => reassignTicketCalls
  };
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
        currentUserName: "Morgan Lee",
        currentUserRole: "admin",
        defaultAssignee: "Morgan Lee"
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
  const legacyUsers = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "cs1-nick", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false }
  ];
  const { context, fetchCalls, storage, persistUserCalls } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-six", assignmentName: "CS6 Backend", role: "rep", active: true },
        { id: "backend-seven", assignmentName: "CS7 Backend", role: "manager", active: true }
      ]
    }
  });
  context.users = JSON.parse(JSON.stringify(legacyUsers));

  await context.hydrateBackendAssignmentUsers();

  assert.deepEqual(context.users, legacyUsers, "backend-auth users should not enter legacy persisted users");
  assert.equal(storage.has(context.USERS_STORAGE_KEY), false, "backend-auth hydration should not write legacy users to localStorage");
  assert.equal(persistUserCalls(), 0, "backend-auth hydration should not call persistUsers");
  assert.deepEqual(fetchCalls.map((call) => [call.method, call.url]), [["GET", "/api/users"]], "backend-auth overlay should only fetch /api/users");
  assert.equal(fetchCalls.some((call) => call.method === "PUT" || call.url === "/api/state/users"), false, "backend-auth overlay should not PUT state users");
  assert.deepEqual(context.visibleAssignmentUsers().map((user) => user.name), ["CS14 Robert", "CS1 Nick"], "Admin Hub visible users should remain legacy-only");
  assert(context.activeAssignmentOptionUsers().some((user) => user.name === "CS6 Backend"), "backend-auth-only user should appear as an active assignment option");
  assert(context.activeAssignmentOptionUsers().some((user) => user.name === "CS7 Backend"), "second backend-auth-only user should appear as an active assignment option");
}

{
  const { context } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "duplicate-nick", assignmentName: " cs1   nick ", role: "manager", active: true },
        { id: "new-backend", assignmentName: "CS6 Backend", role: "rep", active: true },
        { id: "duplicate-removed", assignmentName: "CS8 Removed", role: "manager", active: true },
        { id: "duplicate-disabled", assignmentName: "CS9 Disabled", role: "owner", active: true },
        { id: "duplicate-backend-six", assignmentName: " cs6   backend ", role: "manager", active: true }
      ]
    }
  });
  context.users = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "legacy-nick", name: "CS1 Nick", role: "rep", assignmentEligible: false, removed: false },
    { id: "removed-duplicate", name: "CS8 Removed", role: "rep", assignmentEligible: false, removed: true },
    { id: "disabled-duplicate", name: "CS9 Disabled", role: "rep", assignmentEligible: false, removed: false }
  ];

  await context.hydrateBackendAssignmentUsers();
  const merged = context.mergedAssignmentOptionUsers();
  const nickRows = merged.filter((user) => context.sameAssignmentUserName(user.name, "CS1 Nick"));
  const removedRows = merged.filter((user) => context.sameAssignmentUserName(user.name, "CS8 Removed"));
  const disabledRows = merged.filter((user) => context.sameAssignmentUserName(user.name, "CS9 Disabled"));
  const backendSixRows = merged.filter((user) => context.sameAssignmentUserName(user.name, "CS6 Backend"));
  assert.equal(nickRows.length, 1, "legacy/backend duplicate names should collapse to one visible user");
  assert.equal(nickRows[0].id, "legacy-nick", "legacy metadata should win on duplicate assignment names");
  assert.equal(nickRows[0].role, "rep", "legacy role should win over backend role on duplicate assignment names");
  assert.equal(nickRows[0].assignmentEligible, false, "legacy assignment eligibility should be preserved on duplicate");
  assert.equal(removedRows.length, 1, "removed legacy/backend duplicate names should collapse to one row");
  assert.equal(removedRows[0].id, "removed-duplicate", "removed legacy metadata should win on duplicate assignment names");
  assert.equal(removedRows[0].removed, true, "removed legacy duplicate should stay removed after backend hydration");
  assert.equal(disabledRows.length, 1, "disabled legacy/backend duplicate names should collapse to one row");
  assert.equal(disabledRows[0].id, "disabled-duplicate", "disabled legacy metadata should win on duplicate assignment names");
  assert.equal(disabledRows[0].role, "rep", "disabled legacy role should win over backend role on duplicate assignment names");
  assert.equal(disabledRows[0].assignmentEligible, false, "disabled legacy duplicate should stay disabled after backend hydration");
  assert.equal(backendSixRows.length, 1, "backend duplicate payload names should collapse to one backend gap-fill option");
  assert.equal(backendSixRows[0].id, "new-backend", "first backend gap-fill metadata should win among backend duplicates");
  assert(merged.some((user) => user.name === "CS6 Backend"), "backend users should fill gaps absent from legacy users");
  assert(!context.activeAssignmentOptionUsers().some((user) => user.name === "CS1 Nick"), "legacy disabled duplicate should remain disabled in option list");
  assert(!context.activeAssignmentOptionUsers().some((user) => user.name === "CS8 Removed"), "removed legacy duplicate should not be resurrected by backend users");
  assert(!context.activeAssignmentOptionUsers().some((user) => user.name === "CS9 Disabled"), "disabled legacy duplicate should not be resurrected by backend users");
  assert(context.activeAssignmentOptionUsers().some((user) => user.name === "CS6 Backend"), "new backend user should be active in option list");
}

{
  const { context, renderCalls, persistUserCalls, persistTicketCalls, reassignTicketCalls } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-only", assignmentName: "CS6 Backend", role: "rep", active: true }
      ]
    }
  });
  context.users = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "legacy-nick", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false }
  ];
  context.tickets = [
    { id: "NICK-1", assignee: "CS1 Nick", status: "Open" }
  ];

  await context.hydrateBackendAssignmentUsers();
  const beforeUsers = JSON.parse(JSON.stringify(context.users));
  const beforeBackendUsers = JSON.stringify(context.backendAssignmentUsers);
  const beforeTickets = JSON.parse(JSON.stringify(context.tickets));

  context.toggleAssignmentEligibility("backend-only");
  context.removeAssignmentUser("backend-only");
  context.reassignTicketsFromUser("backend-only", "CS14 Robert");
  context.reassignTicketsFromUser("legacy-nick", "CS6 Backend");

  assert.deepEqual(context.users, beforeUsers, "legacy mutators should ignore backend-only user ids");
  assert.equal(JSON.stringify(context.backendAssignmentUsers), beforeBackendUsers, "legacy mutators should not edit backend-auth overlay users");
  assert.deepEqual(context.tickets, beforeTickets, "legacy reassign helper should not reassign to a backend-only target");
  assert.equal(persistUserCalls(), 0, "backend-only legacy mutator attempts should not call persistUsers");
  assert.equal(persistTicketCalls(), 0, "backend-only legacy mutator attempts should not call persistTickets");
  assert.equal(reassignTicketCalls(), 0, "backend-only legacy mutator attempts should not call reassignTicket");
  assert.equal(renderCalls.length, 0, "backend-only legacy mutator attempts should not render");
}

{
  const { context, renderCalls, storage, persistUserCalls } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-only", assignmentName: "CS6 Backend", role: "rep", active: true }
      ]
    }
  });
  const prevented = { value: false };

  await context.hydrateBackendAssignmentUsers();
  const beforeUsers = JSON.parse(JSON.stringify(context.users));
  context.handleAddRep({
    preventDefault() {
      prevented.value = true;
    },
    currentTarget: {
      fields: {
        repName: " cs6   backend ",
        repRole: "manager"
      }
    }
  });
  context.handleAddRep({
    preventDefault() {},
    currentTarget: {
      fields: {
        repName: " cs1   nick ",
        repRole: "rep"
      }
    }
  });

  assert.equal(prevented.value, true, "add rep handler should prevent the form submit");
  assert.deepEqual(context.users, beforeUsers, "add rep should block normalized duplicate names from entering legacy users");
  assert.equal(storage.has(context.USERS_STORAGE_KEY), false, "blocked backend-auth duplicate add should not write legacy users to localStorage");
  assert.equal(persistUserCalls(), 0, "blocked backend-auth duplicate add should not call persistUsers");
  assert.equal(renderCalls.length, 0, "blocked backend-auth duplicate add should not render");
}

{
  const { context, renderCalls, storage, persistUserCalls } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-only", assignmentName: "CS6 Backend", role: "rep", active: true }
      ]
    }
  });
  context.users = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "removed-backend-duplicate", name: "CS6 Backend", role: "rep", assignmentEligible: false, removed: true }
  ];

  await context.hydrateBackendAssignmentUsers();
  const beforeUsers = JSON.parse(JSON.stringify(context.users));
  context.handleAddRep({
    preventDefault() {},
    currentTarget: {
      fields: {
        repName: "CS6 Backend",
        repRole: "rep"
      }
    }
  });

  assert.deepEqual(context.users, beforeUsers, "add rep should block backend-auth duplicate names even when a removed legacy row exists");
  assert.equal(storage.has(context.USERS_STORAGE_KEY), false, "blocked removed-legacy backend duplicate add should not write legacy users to localStorage");
  assert.equal(persistUserCalls(), 0, "blocked removed-legacy backend duplicate add should not call persistUsers");
  assert.equal(renderCalls.length, 0, "blocked removed-legacy backend duplicate add should not render");
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

  const backendOnlyOptions = context.assignmentSelectOptions("Legacy Free Text");
  assert(backendOnlyOptions.includes('value="Legacy Free Text" selected'), "backend-only current assignee should use the existing backend option and be selected");
  assert.equal((backendOnlyOptions.match(/value="Legacy Free Text"/g) || []).length, 1, "backend-only current assignee should not be inserted twice");

  const freeTextOptions = context.assignmentSelectOptions("Former Rep");
  assert(freeTextOptions.includes('value="Former Rep" selected'), "current free-text assignee should be inserted and selected");
  assert.equal((freeTextOptions.match(/value="Former Rep"/g) || []).length, 1, "current free-text assignee should be inserted once");
  const escapedFreeTextOptions = context.assignmentSelectOptions('Former & "Rep"');
  assert(escapedFreeTextOptions.includes('value="Former &amp; &quot;Rep&quot;" selected'), "current free-text assignee should be escaped and selected");
}

{
  const { context } = createHarness(null, {
    backendUsersPayload: {
      users: [
        { id: "backend-only", assignmentName: "CS6 Backend", role: "rep", active: true },
        { id: "backend-removed-shadow", assignmentName: "CS8 Removed", role: "rep", active: true },
        { id: "backend-disabled-shadow", assignmentName: "CS9 Disabled", role: "rep", active: true }
      ]
    }
  });
  context.users = [
    { id: "cs14-robert", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "cs1-nick", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false },
    { id: "removed-legacy", name: "CS8 Removed", role: "rep", assignmentEligible: false, removed: true },
    { id: "disabled-legacy", name: "CS9 Disabled", role: "rep", assignmentEligible: false, removed: false }
  ];

  await context.hydrateBackendAssignmentUsers();

  const removedCurrentOptions = context.assignmentSelectOptions("CS8 Removed");
  assert(removedCurrentOptions.includes('value="CS8 Removed" selected'), "removed legacy current assignee should be preserved and selected");
  assert.equal((removedCurrentOptions.match(/value="CS8 Removed"/g) || []).length, 1, "removed legacy current assignee should be inserted once");

  const disabledCurrentOptions = context.assignmentSelectOptions("CS9 Disabled");
  assert(disabledCurrentOptions.includes('value="CS9 Disabled" selected'), "disabled legacy current assignee should be preserved and selected");
  assert.equal((disabledCurrentOptions.match(/value="CS9 Disabled"/g) || []).length, 1, "disabled legacy current assignee should be inserted once");

  const backendOnlyCurrentOptions = context.assignmentSelectOptions("CS6 Backend");
  assert(backendOnlyCurrentOptions.includes('value="CS6 Backend" selected'), "backend-only current assignee should be selected from active backend options");
  assert.equal((backendOnlyCurrentOptions.match(/value="CS6 Backend"/g) || []).length, 1, "backend-only active current assignee should not insert a duplicate option");

  const normalizedCurrentOptions = context.assignmentSelectOptions(" cs1   nick ");
  assert(normalizedCurrentOptions.includes('value=" cs1   nick " selected'), "normalized-equivalent current assignee should be preserved and selected");
  assert.equal((normalizedCurrentOptions.match(/value="CS1 Nick"/g) || []).length, 0, "normalized-equivalent current assignee should not render a duplicate canonical option");
  assert.equal((normalizedCurrentOptions.match(/value=" cs1   nick "/g) || []).length, 1, "normalized-equivalent current assignee should render once");
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
