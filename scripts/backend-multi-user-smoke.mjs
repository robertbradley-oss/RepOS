import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const port = 4210;
const dataDir = await mkdtemp(join(tmpdir(), "tessario-multi-user-smoke-"));
const dataFile = join(dataDir, "state.json");
const uploadDir = join(dataDir, "uploads");

await writeSeedState(dataFile);

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

  const session = await getJson(port, "/api/session");
  assert(session.response.ok && session.payload.user?.role === "admin", "Development session did not resolve the default admin user.");
  assert(session.payload.user?.assignmentName === "CS14 Robert", "Session user did not include the expected assignment name.");

  const current = await getJson(port, "/api/users/current");
  assert(current.response.ok, `Current user endpoint failed: ${current.response.status}`);
  assert(current.payload.user?.email === "robbybradley@gmail.com", "Current user endpoint did not return the session user.");
  assert(!("token" in current.payload.user), "Current user endpoint leaked a token field.");

  const directory = await getJson(port, "/api/users");
  assert(directory.response.ok, `Users endpoint failed: ${directory.response.status}`);
  assert(Array.isArray(directory.payload.users), "Users endpoint did not return a users array.");
  assert(directory.payload.users.some((user) => user.repName === "CS1 Nick"), "Users endpoint did not include the active rep.");
  assert(!directory.payload.users.some((user) => user.repName === "CS9 Inactive"), "Users endpoint included an inactive user.");
  assert(directory.payload.users.every((user) => !("token" in user) && !("password" in user)), "Users endpoint leaked sensitive fields.");

  const adminCookie = await login(port, "robbybradley@gmail.com");
  const ownerCookie = await login(port, "owner@example.com");
  const managerCookie = await login(port, "manager@example.com");
  const repCookie = await login(port, "nick@example.com");

  const adminUsers = await getJson(port, "/api/auth/users", adminCookie);
  assert(adminUsers.response.ok, `Admin auth users route failed: ${adminUsers.response.status}`);
  const ownerUsers = await getJson(port, "/api/auth/users", ownerCookie);
  assert(ownerUsers.response.ok, `Owner auth users route failed: ${ownerUsers.response.status}`);

  for (const [label, cookie] of [["manager", managerCookie], ["rep", repCookie]]) {
    const restrictedUsers = await getJson(port, "/api/auth/users", cookie);
    assert(restrictedUsers.response.status === 403, `${label} could read admin auth users.`);
    const restrictedState = await getJson(port, "/api/state/users", cookie);
    assert(restrictedState.response.status === 403, `${label} could read admin assignment state.`);
    const restrictedKnowledge = await getJson(port, "/api/state/knowledgeDocs", cookie);
    assert(restrictedKnowledge.response.status === 403, `${label} could read Knowledge Vault state.`);
    const restrictedReset = await fetch(`http://127.0.0.1:${port}/api/reset`, {
      method: "POST",
      headers: { Cookie: cookie }
    });
    assert(restrictedReset.status === 403, `${label} could reset the workspace.`);
  }

  const repCurrent = await getJson(port, "/api/users/current", repCookie);
  assert(repCurrent.response.ok && repCurrent.payload.user?.assignmentName === "CS1 Nick", "Rep current user did not resolve by session.");

  const assignedList = await getJson(port, "/api/tickets?assignee=me", repCookie);
  assert(assignedList.response.ok, `Rep assignee=me list failed: ${assignedList.response.status}`);
  assert(assignedList.payload.tickets?.length === 1 && assignedList.payload.tickets[0].id === "REP-OPEN", "assignee=me did not use the rep session assignment name.");

  const assignedQueue = await getJson(port, "/api/queue-views/assigned/tickets", repCookie);
  assert(assignedQueue.response.ok, `Rep assigned queue failed: ${assignedQueue.response.status}`);
  assert(assignedQueue.payload.total === 1 && assignedQueue.payload.tickets?.[0]?.id === "REP-OPEN", "Queue assignee=current did not use the rep session assignment name.");

  const analytics = await getJson(port, "/api/analytics/summary", repCookie);
  assert(analytics.response.ok, `Rep analytics failed: ${analytics.response.status}`);
  assert(analytics.payload.summary?.context?.currentUserName === "CS1 Nick", "Analytics context did not use the rep session assignment name.");
  assert(analytics.payload.summary?.metrics?.assignedToCurrentUserCount === 1, "Analytics assigned-to-current-user metric was not session scoped.");

  const validCreate = await postJson(port, "/api/tickets", {
    id: "VALID-AUTH-ASSIGNEE",
    subject: "Valid auth assignee",
    status: "Open",
    assignee: "CS1 Nick",
    customer: { name: "Valid Customer", email: "valid@example.com" }
  }, adminCookie);
  assert(validCreate.response.status === 201, `Valid auth assignee create failed: ${validCreate.response.status}`);

  const displayNamePatch = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", {
    assignee: "Manager Maya"
  }, adminCookie);
  assert(displayNamePatch.response.ok && displayNamePatch.payload.ticket?.assignee === "Manager Maya", "Valid displayName assignment patch failed.");

  const legacyPatch = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", {
    assignee: "CS2 Julius"
  }, adminCookie);
  assert(legacyPatch.response.ok && legacyPatch.payload.ticket?.assignee === "CS2 Julius", "Legacy assignment-user compatibility patch failed.");

  const normalizedPatch = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", {
    assignee: " cs2   julius "
  }, adminCookie);
  assert(normalizedPatch.response.ok && normalizedPatch.payload.ticket?.assignee === "cs2   julius", "Normalized legacy assignment-user compatibility patch failed.");

  for (const [assignee, expected] of [
    ["Unknown Rep", "unknown assignee"],
    ["CS3 Sean", "removed legacy assignee"],
    ["CS4 Disabled", "disabled legacy assignee"],
    ["CS9 Inactive", "inactive auth assignee"]
  ]) {
    const invalid = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", { assignee }, adminCookie);
    assert(invalid.response.status === 400, `Invalid ${expected} did not return 400.`);
    assert(invalid.payload.error === "invalid_ticket_assignee", `Invalid ${expected} returned wrong error.`);
    assert(Array.isArray(invalid.payload.details?.allowedAssignees), `Invalid ${expected} did not return allowedAssignees.`);
    assert(invalid.payload.details.allowedAssignees.includes("CS1 Nick"), `Invalid ${expected} allowedAssignees omitted active auth user.`);
    assert(invalid.payload.details.allowedAssignees.includes("CS2 Julius"), `Invalid ${expected} allowedAssignees omitted eligible legacy user.`);
    assert(!invalid.payload.details.allowedAssignees.includes(assignee), `Invalid ${expected} was included in allowedAssignees.`);
  }

  const emptyAssignee = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", {
    assignee: ""
  }, adminCookie);
  assert(emptyAssignee.response.ok && emptyAssignee.payload.ticket?.assignee === "", "Empty assignee patch did not leave the ticket unassigned.");

  const emptyPatch = await patchJson(port, "/api/tickets/VALID-AUTH-ASSIGNEE", {}, adminCookie);
  assert(emptyPatch.response.ok && emptyPatch.payload.ticket?.assignee === "", "Empty patch did not preserve the unassigned ticket.");

  const invalidCreate = await postJson(port, "/api/tickets", {
    id: "INVALID-ASSIGNEE",
    subject: "Invalid assignee",
    status: "Open",
    assignee: "Unknown Rep",
    customer: { name: "Invalid Customer", email: "invalid@example.com" }
  }, adminCookie);
  assert(invalidCreate.response.status === 400, "Invalid create assignee did not return 400.");
  assert(invalidCreate.payload.error === "invalid_ticket_assignee", "Invalid create assignee returned wrong error.");
  assert(Array.isArray(invalidCreate.payload.details?.allowedAssignees), "Invalid create assignee did not return allowedAssignees.");
  assert(invalidCreate.payload.details.allowedAssignees.includes("Manager Maya"), "Invalid create allowedAssignees omitted active auth displayName.");
  assert(!invalidCreate.payload.details.allowedAssignees.includes("Unknown Rep"), "Invalid create allowedAssignees included unknown assignee.");

  const managerBootstrap = await getJson(port, "/api/bootstrap", managerCookie);
  assert(managerBootstrap.response.ok, `Manager bootstrap failed: ${managerBootstrap.response.status}`);
  for (const resource of ["knowledgeDocs", "authUsers", "authSessions", "fileRecords", "macros"]) {
    assert(!Object.hasOwn(managerBootstrap.payload.state || {}, resource), `Manager bootstrap exposed ${resource}.`);
  }
  assert(Object.hasOwn(managerBootstrap.payload.state || {}, "tickets"), "Manager bootstrap did not include operational ticket state.");

  const ownerBootstrap = await getJson(port, "/api/bootstrap", ownerCookie);
  assert(ownerBootstrap.response.ok, `Owner bootstrap failed: ${ownerBootstrap.response.status}`);
  assert(Object.hasOwn(ownerBootstrap.payload.state || {}, "knowledgeDocs"), "Owner bootstrap did not include admin state.");
  assert(Object.hasOwn(ownerBootstrap.payload.state || {}, "authUsers"), "Owner bootstrap did not include auth users.");

  await runStrictUsersSmoke();
  console.log("Backend multi-user smoke test passed.");
} finally {
  server.kill();
}

async function writeSeedState(targetFile) {
  const now = new Date().toISOString();
  const state = {
    version: 1,
    createdAt: now,
    updatedAt: now,
    settings: {
      workspaceName: "iSpring Water Systems",
      workspaceLabel: "Workspace: iSpring Water Systems",
      supportEmail: "support@ispringfilters.com",
      currentUserName: "CS14 Robert",
      currentUserRole: "admin",
      defaultAssignee: "CS14 Robert",
      timezone: "America/New_York",
      demoMode: true,
      defaultSlaHours: 48,
      overdueGraceHours: 0,
      allowedStatuses: ["Open", "Closed, Waiting On Response", "Closed"]
    },
    authUsers: [
      authUser("cs14-robert", "robbybradley@gmail.com", "CS14 Robert", "admin", now),
      authUser("owner-olivia", "owner@example.com", "Owner Olivia", "owner", now),
      authUser("manager-maya", "manager@example.com", "Manager Maya", "manager", now),
      authUser("cs1-nick", "nick@example.com", "CS1 Nick", "rep", now),
      authUser("cs3-sean-auth-duplicate", "sean@example.com", "CS3 Sean", "rep", now),
      authUser("cs4-disabled-auth-duplicate", "disabled@example.com", "CS4 Disabled", "rep", now),
      authUser("cs9-inactive", "inactive@example.com", "CS9 Inactive", "rep", now, false)
    ],
    authSessions: [],
    users: [
      { id: "cs2-julius", name: "CS2 Julius", role: "rep", assignmentEligible: true, removed: false },
      { id: "cs3-sean", name: "CS3 Sean", role: "rep", assignmentEligible: true, removed: true },
      { id: "cs4-disabled", name: "CS4 Disabled", role: "rep", assignmentEligible: false, removed: false }
    ],
    tickets: [
      {
        id: "REP-OPEN",
        subject: "Rep scoped open ticket",
        status: "Open",
        assignee: "CS1 Nick",
        customer: { name: "Rep Customer", email: "rep@example.com" },
        createdAt: now,
        updatedAt: now,
        conversation: []
      },
      {
        id: "ADMIN-OPEN",
        subject: "Admin scoped open ticket",
        status: "Open",
        assignee: "CS14 Robert",
        customer: { name: "Admin Customer", email: "admin@example.com" },
        createdAt: now,
        updatedAt: now,
        conversation: []
      }
    ],
    queueViews: null,
    knowledgeDocs: [{ id: "kv-smoke", fileName: "admin-only.txt", archived: false }],
    fileRecords: [{ id: "file-smoke", category: "knowledge", originalName: "admin-only.txt" }],
    macros: [{ id: "macro-smoke", name: "Admin only macro" }]
  };
  await writeFile(targetFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function authUser(id, email, displayName, role, now, active = true) {
  return {
    id,
    email,
    displayName,
    repName: displayName,
    role,
    active,
    createdAt: now,
    updatedAt: now
  };
}

async function login(targetPort, email) {
  const response = await fetch(`http://127.0.0.1:${targetPort}/api/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error(`Dev login failed for ${email}: ${response.status}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`Dev login did not return a cookie for ${email}.`);
  return cookie;
}

async function getJson(targetPort, path, cookie = "") {
  const response = await fetch(`http://127.0.0.1:${targetPort}${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined
  });
  return { response, payload: await response.json() };
}

async function postJson(targetPort, path, body, cookie = "") {
  const response = await fetch(`http://127.0.0.1:${targetPort}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  });
  return { response, payload: await response.json() };
}

async function patchJson(targetPort, path, body, cookie = "") {
  const response = await fetch(`http://127.0.0.1:${targetPort}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  });
  return { response, payload: await response.json() };
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

async function runStrictUsersSmoke() {
  const strictPort = 4211;
  const strictDataDir = await mkdtemp(join(tmpdir(), "tessario-multi-user-strict-smoke-"));
  const strictDataFile = join(strictDataDir, "state.json");
  await writeSeedState(strictDataFile);

  const strictServer = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(strictPort),
      TESSARIO_AUTH_MODE: "strict",
      TESSARIO_DATA_FILE: strictDataFile
    },
    stdio: "pipe"
  });

  try {
    await waitForHealth(strictPort);
    const unauthenticatedCurrent = await fetch(`http://127.0.0.1:${strictPort}/api/users/current`);
    assert(unauthenticatedCurrent.status === 401, `Strict users/current should require auth, got ${unauthenticatedCurrent.status}.`);
    const unauthenticatedUsers = await fetch(`http://127.0.0.1:${strictPort}/api/users`);
    assert(unauthenticatedUsers.status === 401, `Strict users should require auth, got ${unauthenticatedUsers.status}.`);

    const cookie = await login(strictPort, "owner@example.com");
    const current = await getJson(strictPort, "/api/users/current", cookie);
    assert(current.response.ok && current.payload.user?.role === "owner", "Strict authenticated current user failed.");
    const users = await getJson(strictPort, "/api/users", cookie);
    assert(users.response.ok && users.payload.users?.some((user) => user.role === "rep"), "Strict authenticated users directory failed.");
  } finally {
    strictServer.kill();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
