import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, link, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = await mkdtemp(join(tmpdir(), "repos-static-"));
assert.equal(dirname(resolve(fixture)), resolve(tmpdir()), "Fixture cleanup must stay inside the OS temporary directory");
let server;
try {
  for (const entry of ["server.mjs", "lib", "db", "package.json", "index.html", "app.js", "home.js", "styles.css", "home.css", "assets"]) {
    await cp(join(source, entry), join(fixture, entry), { recursive: true });
  }
  const assetFiles = await readdir(join(fixture, "assets"));
  await symlink(join(source, "node_modules"), join(fixture, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await mkdir(join(fixture, ".data"));
  await mkdir(join(fixture, ".uploads"));
  const secret = "synthetic-private-content";
  for (const entry of [".env", ".data/tessario-state.json.bak", ".data/state.tmp", ".uploads/receipt.txt", "private.json", "assets/private.txt", "assets/unlisted.png"]) {
    await writeFile(join(fixture, entry), secret);
  }
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: fixture,
    env: {
      ...process.env, DATABASE_URL: "", HOST: "127.0.0.1", PORT: String(port),
      NODE_ENV: "production", TESSARIO_AUTH_MODE: "strict", TESSARIO_DISABLE_DEV_LOGIN: "1",
      TESSARIO_DATA_FILE: join(fixture, ".data", "tessario-state.json"),
      TESSARIO_UPLOAD_DIR: join(fixture, ".uploads"), REPOS_SECURE_COOKIES: "1",
      REPOS_SESSION_SECRET: "synthetic-static-smoke-session-secret-32-characters",
      REPOS_ADMIN_EMAIL: "static-smoke@example.test", REPOS_ADMIN_PASSWORD: "synthetic-smoke-password",
      REPOS_ADMIN_PASSWORD_HASH: "", TESSARIO_ADMIN_PASSWORD_HASH: "", REPOS_SSO_ENABLED: "0"
    }, stdio: ["ignore", "pipe", "pipe"]
  });
  let diagnostics = "";
  server.stdout.on("data", (chunk) => { diagnostics += chunk; });
  server.stderr.on("data", (chunk) => { diagnostics += chunk; });
  const get = (path, method = "GET") => new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Server exited before readiness: ${diagnostics}`);
    try { ready = (await get("/api/health")).status === 200; } catch { /* starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(ready, `Server did not start: ${diagnostics}`);
  for (const path of ["/.env", "/.data/tessario-state.json", "/.data/tessario-state.json.bak", "/.data/state.tmp", "/.uploads/receipt.txt", "/private.json", "/server.mjs", "/package.json", "/lib/json-store.mjs", "/db/schema.sql", "/scripts/backend-smoke.mjs", "/assets/private.txt", "/assets/unlisted.png", "/%2eenv", "/%2edata/tessario-state.json", "/.data%2ftessario-state.json", "/assets/..%2f.env", "/assets/..%5c.data/tessario-state.json", "/%252edata/tessario-state.json", "/%", "/%00", "/app.js/", "/app.js.", "/APP.JS", "/app.js:secret", "/C:/private.json"]) {
    const response = await get(path);
    assert.equal(response.status, 404, `Private or ambiguous path was served: ${path}`);
    assert.ok(!response.body.includes(Buffer.from(secret)), `Private content leaked: ${path}`);
  }
  for (const [url, entry, type] of [["/", "index.html", "text/html"], ["/index.html?cache=1", "index.html", "text/html"], ["/app.js", "app.js", "application/javascript"], ["/home.js", "home.js", "application/javascript"], ["/styles.css", "styles.css", "text/css"], ["/home.css", "home.css", "text/css"], ["/assets/repos-mark.svg", "assets/repos-mark.svg", "image/svg+xml"], ["/assets/repos-mark.png", "assets/repos-mark.png", "image/png"]]) {
    const response = await get(url);
    assert.equal(response.status, 200, `Public asset failed: ${url}`);
    assert.deepEqual(response.body, await readFile(join(fixture, entry)));
    assert.ok(response.headers["content-type"].startsWith(type));
    assert.equal(response.headers["cache-control"], "no-store");
    const head = await get(url, "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
  }
  for (const name of assetFiles) {
    const response = await get(`/assets/${name}`);
    assert.equal(response.status, 200, `Shipped asset is missing from the public manifest: ${name}`);
    assert.deepEqual(response.body, await readFile(join(fixture, "assets", name)));
    assert.ok(response.headers["content-type"].startsWith(extname(name) === ".svg" ? "image/svg+xml" : "image/png"));
    const head = await get(`/assets/${name}`, "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
  }
  assert.equal((await get("/api/files/synthetic-missing-file")).status, 401, "File API must still require authentication");
  const post = await get("/app.js", "POST");
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");

  // A public-looking path must not follow a linked directory into private storage.
  await rename(join(fixture, "assets"), join(fixture, "public-assets-backup"));
  await writeFile(join(fixture, ".uploads", "repos-mark.svg"), secret);
  await symlink(join(fixture, ".uploads"), join(fixture, "assets"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await get("/assets/repos-mark.svg")).status, 404, "Linked assets directory exposed private storage");
  await rm(join(fixture, "assets"));
  await rename(join(fixture, "public-assets-backup"), join(fixture, "assets"));

  // On hosts that permit file symlinks, cover a linked file inside the real assets directory too.
  const asset = join(fixture, "assets", "repos-mark.svg");
  await rename(asset, `${asset}.original`);
  await link(join(fixture, ".env"), asset);
  assert.equal((await get("/assets/repos-mark.svg")).status, 404, "Hardlinked public file exposed private content");
  await rm(asset);
  let linked = false;
  try { await symlink(join(fixture, ".env"), asset); linked = true; }
  catch (error) { if (process.platform !== "win32" || error.code !== "EPERM") throw error; }
  if (linked) assert.equal((await get("/assets/repos-mark.svg")).status, 404, "Linked public file exposed private content");
  else console.log("File-symlink creation unavailable; directory-junction escape check passed.");
  console.log("Static file boundary smoke passed (strict auth, private paths, aliases, public GET/HEAD, linked paths).");
} finally {
  if (server && server.exitCode === null) { server.kill(); await once(server, "exit"); }
  await rm(fixture, { recursive: true, force: true });
}
