import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const port = 4199;
const dataDir = await mkdtemp(join(tmpdir(), "tessario-smoke-"));
const dataFile = join(dataDir, "state.json");
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    TESSARIO_DATA_FILE: dataFile
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

  const patched = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Closed" })
  });
  if (!patched.ok) throw new Error(`Ticket patch failed: ${patched.status}`);

  const note = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author: "Smoke Test", body: "Backend note route works." })
  });
  if (note.status !== 201) throw new Error(`Ticket note failed: ${note.status}`);

  const ticketRead = await fetch(`http://127.0.0.1:${port}/api/tickets/SMOKE-1`);
  const ticketPayload = await ticketRead.json();
  if (ticketPayload.ticket?.status !== "Closed" || ticketPayload.ticket?.conversation?.length !== 1) {
    throw new Error("Ticket normalized API readback did not match expected state.");
  }

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
