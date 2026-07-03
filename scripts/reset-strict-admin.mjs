import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

const dataFile = process.env.TESSARIO_DATA_FILE || "";
const email = normalizeEmail(process.env.REPOS_ADMIN_EMAIL || process.env.TESSARIO_ADMIN_EMAIL || "");
const password = process.env.REPOS_ADMIN_PASSWORD || process.env.TESSARIO_ADMIN_PASSWORD || "";
const passwordHash = process.env.REPOS_ADMIN_PASSWORD_HASH || process.env.TESSARIO_ADMIN_PASSWORD_HASH || "";
const displayName = cleanText(process.env.REPOS_ADMIN_NAME || process.env.TESSARIO_ADMIN_NAME || "RepOS Admin", 80);
const role = normalizeRole(process.env.REPOS_ADMIN_ROLE || process.env.TESSARIO_ADMIN_ROLE || "admin");
const confirmation = process.env.REPOS_CONFIRM_ADMIN_RESET || "";

if (confirmation !== "reset-strict-admin") {
  fail("Set REPOS_CONFIRM_ADMIN_RESET=reset-strict-admin to confirm this server-side admin reset.");
}
if (!dataFile) {
  fail("Set TESSARIO_DATA_FILE to the JSON state file you want to update.");
}
if (process.env.DATABASE_URL) {
  fail("This helper only edits JSON state. For Postgres, use env-provisioned REPOS_ADMIN_* on server startup.");
}
if (!email) {
  fail("Set REPOS_ADMIN_EMAIL or TESSARIO_ADMIN_EMAIL.");
}
if (!password && !passwordHash) {
  fail("Set REPOS_ADMIN_PASSWORD or REPOS_ADMIN_PASSWORD_HASH.");
}
if (passwordHash && !isValidPasswordHash(passwordHash)) {
  fail("REPOS_ADMIN_PASSWORD_HASH must use scrypt$saltHex$hashHex format.");
}

const statePath = resolve(dataFile);
const raw = await readFile(statePath, "utf8").catch((error) => {
  fail(`Could not read TESSARIO_DATA_FILE: ${error.message}`);
});
const state = JSON.parse(raw.replace(/^\uFEFF/, ""));
const now = new Date().toISOString();
const users = Array.isArray(state.authUsers) ? state.authUsers : [];
const existing = users.find((user) => normalizeEmail(user?.email) === email);
const user = {
  ...(existing || {}),
  id: existing?.id || authUserIdFromEmail(email),
  email,
  displayName,
  repName: displayName,
  role,
  active: true,
  passwordHash: passwordHash || hashPassword(password),
  createdAt: existing?.createdAt || now,
  updatedAt: now
};

state.authUsers = [user, ...users.filter((item) => normalizeEmail(item?.email) !== email && item?.id !== user.id)];
state.authSessions = [];
state.updatedAt = now;

await mkdir(dirname(statePath), { recursive: true });
await copyFile(statePath, `${statePath}.pre-admin-reset-${Date.now()}.bak`).catch(() => {});
const tmpFile = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
await writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
await rename(tmpFile, statePath);

console.log(`Updated strict admin user ${email} in ${statePath}`);
console.log("Existing sessions were cleared. Restart RepOS, then sign in with the configured admin password.");

function fail(message) {
  console.error(`Admin reset aborted: ${message}`);
  process.exit(1);
}

function hashPassword(value) {
  const salt = randomBytes(16);
  const derived = scryptSync(String(value), salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function isValidPasswordHash(value) {
  if (typeof value !== "string") return false;
  const [scheme, saltHex, hashHex] = value.split("$");
  return scheme === "scrypt" &&
    /^[a-f0-9]{16,}$/i.test(saltHex || "") &&
    /^[a-f0-9]{64,}$/i.test(hashHex || "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, maxLength) {
  const text = String(value || "").replace(/[\u0000-\u001f]/g, "").trim();
  return text.slice(0, maxLength);
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return ["admin", "manager", "owner", "rep"].includes(role) ? role : "admin";
}

function authUserIdFromEmail(value) {
  return String(value || "repos-admin")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "repos-admin";
}
