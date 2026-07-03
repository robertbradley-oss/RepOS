import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

await runMissingStrictConfigFails();
await runValidProductionStrictHealth();

console.log("Strict deployment readiness smoke passed.");

async function runMissingStrictConfigFails() {
  const dataDir = await mkdtemp(join(tmpdir(), "repos-strict-missing-"));
  await writeFile(join(dataDir, "state.json"), `${JSON.stringify({
    version: 1,
    settings: { workspaceName: "iSpring Water Systems" },
    authUsers: [],
    authSessions: []
  }, null, 2)}\n`, "utf8");

  const result = await runServerToExit({
    NODE_ENV: "production",
    TESSARIO_AUTH_MODE: "strict",
    TESSARIO_DISABLE_DEV_LOGIN: "1",
    TESSARIO_DATA_FILE: join(dataDir, "state.json"),
    TESSARIO_UPLOAD_DIR: join(dataDir, "uploads"),
    REPOS_SECURE_COOKIES: "1"
  });

  assert(result.code !== 0, "Production strict server should fail without admin credentials and session secret.");
  assert(result.output.includes("Production strict mode requires"), "Missing session secret error was not reported.");
  assert(result.output.includes("Strict mode has no env admin credentials"), "Missing admin credential error was not reported.");
}

async function runValidProductionStrictHealth() {
  const port = 4220;
  const dataDir = await mkdtemp(join(tmpdir(), "repos-strict-valid-"));
  await writeFile(join(dataDir, "state.json"), `${JSON.stringify({
    version: 1,
    settings: { workspaceName: "iSpring Water Systems" },
    authUsers: [],
    authSessions: []
  }, null, 2)}\n`, "utf8");

  const server = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      TESSARIO_AUTH_MODE: "strict",
      TESSARIO_DISABLE_DEV_LOGIN: "1",
      TESSARIO_DATA_FILE: join(dataDir, "state.json"),
      TESSARIO_UPLOAD_DIR: join(dataDir, "uploads"),
      REPOS_SECURE_COOKIES: "1",
      REPOS_SESSION_SECRET: "strict-smoke-session-secret-minimum-32-chars",
      REPOS_ADMIN_EMAIL: "strict-deploy@example.com",
      REPOS_ADMIN_PASSWORD: "correct-horse-battery-staple",
      REPOS_ADMIN_NAME: "Strict Deploy Admin",
      REPOS_ADMIN_ROLE: "owner"
    },
    stdio: "pipe"
  });

  try {
    await waitForHealth(port);
    const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
    const health = await healthResponse.json();
    assert(healthResponse.ok, "Production strict health request failed.");
    assert(health.nodeEnv === "production", "Health did not report production NODE_ENV.");
    assert(health.auth?.mode === "strict", "Health did not report strict auth mode.");
    assert(health.auth?.sessionSecretConfigured === true, "Health did not report configured session secret.");
    assert(health.auth?.sessionSecretStrong === true, "Health did not report strong session secret.");
    assert(health.auth?.strictLoginConfigured === true, "Health did not report strict login readiness.");
    assert(health.auth?.devLogin === false, "Health reported dev login enabled in strict mode.");
    assert(health.database?.enabled === false, "Health should not report Postgres without DATABASE_URL.");
    assert(health.storage?.dataFile?.type === "absolute", "Health did not classify the JSON state path.");
    assert(health.readiness?.ready === true, "Health did not report ready production config.");

    const devLogin = await fetch(`http://127.0.0.1:${port}/api/auth/dev-login`, { method: "POST" });
    assert(devLogin.status === 403, `Strict dev login should be disabled, got ${devLogin.status}.`);

    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "strict-deploy@example.com", password: "correct-horse-battery-staple" })
    });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert(login.ok && cookie?.includes("."), "Strict login did not return a signed session cookie.");

    const tamperedCookie = cookie.replace(/\.[^=.]+$/, ".tampered");
    const tampered = await fetch(`http://127.0.0.1:${port}/api/users/current`, {
      headers: { Cookie: tamperedCookie }
    });
    assert(tampered.status === 401, "Tampered signed session cookie should not authenticate.");
  } finally {
    server.kill();
  }
}

function runServerToExit(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["server.mjs"], {
      env: { ...process.env, ...env, PORT: "4221" },
      stdio: "pipe"
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });
    child.on("exit", (code) => resolve({ code, output }));
  });
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
