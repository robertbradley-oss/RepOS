import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile("app.js", "utf8");
const roleGateSource = [
  "isBackendPlainObject",
  "sessionUserRole",
  "currentUserIsAdmin",
  "currentUserCanUseMacros",
  "showAdminScreen",
  "showKnowledgeVaultScreen",
  "showMacroLibrary"
].map((name) => extractSimpleFunction(appSource, name)).join("\n\n");

function extractSimpleFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

function createRoleHarness(role, options = {}) {
  const calls = [];
  const toasts = [];
  const context = {
    role,
    assignmentRole: options.assignmentRole || "",
    selected: options.selected || null,
    sessionUser: options.sessionUser || null,
    workspaceSettings: { currentUserRole: role },
    uiState: { activeScreen: "queue" },
    calls,
    toasts,
    currentAssignmentUser() {
      return context.assignmentRole ? { role: context.assignmentRole } : null;
    },
    currentDemoUserRole() {
      return context.role;
    },
    selectedTicket() {
      return context.selected;
    },
    openTicketDetail(ticketId) {
      calls.push(["openTicketDetail", ticketId]);
    },
    render() {
      calls.push(["render"]);
    },
    showToast(message) {
      toasts.push(message);
    }
  };
  vm.createContext(context);
  vm.runInContext(roleGateSource, context, { filename: "app.js#admin-role-gates" });
  return context;
}

for (const role of ["rep", "manager"]) {
  const context = createRoleHarness(role, { selected: { id: "T-1" } });
  assert.equal(context.currentUserIsAdmin(), false, `${role} should not be treated as admin`);
  assert.equal(context.currentUserCanUseMacros(), false, `${role} should not be able to use macros`);

  context.showAdminScreen();
  context.showKnowledgeVaultScreen();
  context.showMacroLibrary();

  assert.deepEqual(context.calls, [], `${role} should not navigate to admin, knowledge, or macros`);
  assert.deepEqual(context.toasts, [], `${role} macro shortcut should not reveal macro availability`);
  assert.equal(context.uiState.activeScreen, "queue", `${role} should remain on the current screen`);
}

for (const role of ["admin", "owner"]) {
  const context = createRoleHarness(role, { selected: { id: "T-2" } });
  assert.equal(context.currentUserIsAdmin(), true, `${role} should be treated as admin`);
  assert.equal(context.currentUserCanUseMacros(), true, `${role} should be able to use macros`);

  context.showAdminScreen();
  context.showKnowledgeVaultScreen();
  context.showMacroLibrary();

  assert.deepEqual(context.calls, [["render"], ["render"], ["openTicketDetail", "T-2"]]);
  assert.equal(context.toasts.at(-1), "Macros are available in the ticket context panel.");
}

{
  const context = createRoleHarness("admin");
  context.showMacroLibrary();
  assert.equal(context.toasts.at(-1), "Select a ticket to use macros in context.");
}

assert.match(
  appSource,
  /\$\{renderComposerMacroTool\(\)\}/,
  "ticket detail composer should render macro controls only through the role-gated helper"
);
assert.match(
  appSource,
  /function renderComposerMacroTool\(\) {\s+if \(!currentUserCanUseMacros\(\)\) return "";/,
  "composer macro helper should return no UI for non-admin users"
);
assert.match(
  appSource,
  /document\.querySelector\("#composerMacroSelect"\)\?\.addEventListener/,
  "composer macro listener must tolerate non-admin markup being absent"
);
assert.match(
  appSource,
  /function renderMacroPanel\(ticket\) {\s+if \(!currentUserCanUseMacros\(\)\) return "";/,
  "ticket macro panel should be role-gated before rendering macro data"
);
assert.match(
  appSource,
  /function renderDailyMacroSection\(ticket\) {\s+if \(!currentUserCanUseMacros\(\)\) return "";/,
  "daily macro panel should be role-gated before rendering macro data"
);
assert.match(
  appSource,
  /function insertMacro\(macroId\) {\s+if \(!currentUserCanUseMacros\(\)\) {\s+showToast\("Macros are available to admins only\."\);\s+return;\s+}/,
  "insertMacro should block non-admin direct calls"
);
assert.match(
  appSource,
  /function copyMacro\(macroId\) {\s+if \(!currentUserCanUseMacros\(\)\) {\s+showToast\("Macros are available to admins only\."\);\s+return;\s+}/,
  "copyMacro should block non-admin direct calls"
);

console.log("Frontend admin role smoke test passed.");
