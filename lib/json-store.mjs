import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function createJsonStore({ dataFile, defaultState }) {
  let stateCache = null;

  return {
    mode: "json-file",
    loadState,
    saveState,
    getResource,
    setResource,
    resetState,
    listTickets,
    getTicket,
    createTicket,
    patchTicket,
    appendTicketMessage,
    ensureAuthUser,
    listAuthUsers,
    findAuthUserByEmail,
    getAuthSession,
    createAuthSession,
    deleteAuthSession,
    listCustomers,
    getCustomer,
    createCustomer,
    patchCustomer,
    listCustomerTickets,
    addCustomerNote,
    addCustomerReceipt,
    addCustomerWarranty
  };

  async function loadState() {
    if (stateCache) return stateCache;
    try {
      const raw = await readFile(dataFile, "utf8");
      stateCache = { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      stateCache = defaultState();
      await saveState(stateCache);
    }
    return stateCache;
  }

  async function saveState(state) {
    await mkdir(dirname(dataFile), { recursive: true });
    const tmpFile = `${dataFile}.${process.pid}.tmp`;
    await writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tmpFile, dataFile);
    stateCache = state;
  }

  async function getResource(resource) {
    const state = await loadState();
    return state[resource] ?? null;
  }

  async function setResource(resource, value) {
    const state = await loadState();
    state[resource] = value;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return state.updatedAt;
  }

  async function resetState() {
    stateCache = defaultState();
    await saveState(stateCache);
    return stateCache;
  }

  async function listTickets(filters = {}) {
    const tickets = await ticketCollection();
    return filterTickets(tickets, filters);
  }

  async function getTicket(id) {
    const tickets = await ticketCollection();
    return tickets.find((ticket) => String(ticket.id) === String(id)) || null;
  }

  async function createTicket(input) {
    const now = new Date().toISOString();
    const ticket = {
      ...input,
      id: String(input.id || input.ticketNumber || randomUUID()),
      status: input.status || "Open",
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
      conversation: Array.isArray(input.conversation) ? input.conversation : []
    };
    const tickets = await ticketCollection();
    tickets.unshift(ticket);
    await replaceTickets(tickets);
    return ticket;
  }

  async function patchTicket(id, patch) {
    const tickets = await ticketCollection();
    const index = tickets.findIndex((ticket) => String(ticket.id) === String(id));
    if (index === -1) return null;
    const next = {
      ...tickets[index],
      ...patch,
      id: tickets[index].id,
      updatedAt: new Date().toISOString()
    };
    tickets[index] = next;
    await replaceTickets(tickets);
    return next;
  }

  async function appendTicketMessage(id, input) {
    const tickets = await ticketCollection();
    const index = tickets.findIndex((ticket) => String(ticket.id) === String(id));
    if (index === -1) return null;
    const message = {
      id: input.id || randomUUID(),
      type: input.type || "note",
      author: input.author || "System",
      timestamp: input.timestamp || new Date().toISOString(),
      body: input.body || ""
    };
    const ticket = {
      ...tickets[index],
      updatedAt: new Date().toISOString(),
      conversation: [...(Array.isArray(tickets[index].conversation) ? tickets[index].conversation : []), message]
    };
    tickets[index] = ticket;
    await replaceTickets(tickets);
    return { ticket, message };
  }

  async function ensureAuthUser(user) {
    const state = await loadState();
    const users = Array.isArray(state.authUsers) ? state.authUsers : [];
    const existing = users.find((item) => item.email === user.email || item.id === user.id);
    const now = new Date().toISOString();
    if (existing) {
      Object.assign(existing, { ...user, id: existing.id, updatedAt: now });
    } else {
      users.push({ ...user, id: user.id || randomUUID(), active: user.active !== false, createdAt: now, updatedAt: now });
    }
    state.authUsers = users;
    state.updatedAt = now;
    await saveState(state);
    return users.find((item) => item.email === user.email || item.id === user.id);
  }

  async function listAuthUsers() {
    const state = await loadState();
    return Array.isArray(state.authUsers) ? state.authUsers : [];
  }

  async function findAuthUserByEmail(email) {
    const users = await listAuthUsers();
    return users.find((user) => user.email === email) || null;
  }

  async function getAuthSession(token) {
    const state = await loadState();
    const sessions = Array.isArray(state.authSessions) ? state.authSessions : [];
    const session = sessions.find((item) => item.token === token);
    if (!session || new Date(session.expiresAt) <= new Date()) return null;
    const users = Array.isArray(state.authUsers) ? state.authUsers : [];
    const user = users.find((item) => item.id === session.userId && item.active !== false);
    return user ? { session, user } : null;
  }

  async function createAuthSession(userId, { token, expiresAt }) {
    const state = await loadState();
    const sessions = Array.isArray(state.authSessions) ? state.authSessions : [];
    const session = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt
    };
    state.authSessions = [...sessions.filter((item) => item.token !== token), session];
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return session;
  }

  async function deleteAuthSession(token) {
    const state = await loadState();
    const sessions = Array.isArray(state.authSessions) ? state.authSessions : [];
    state.authSessions = sessions.filter((item) => item.token !== token);
    state.updatedAt = new Date().toISOString();
    await saveState(state);
  }

  async function listCustomers(filters = {}) {
    return filterCustomers(await customerCollection(), filters);
  }

  async function getCustomer(id) {
    const customers = await customerCollection();
    return customers.find((customer) => customerMatchesId(customer, id)) || null;
  }

  async function createCustomer(input) {
    const customer = normalizeCustomer(input);
    if (!customer.email) return null;
    const state = await loadState();
    const accounts = customerAccountMap(state);
    accounts[customer.email] = customer;
    state.customerAccounts = accounts;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return customer;
  }

  async function patchCustomer(id, patch) {
    const current = await getCustomer(id);
    if (!current) return null;
    const next = normalizeCustomer({ ...current, ...patch, email: patch.email || current.email });
    const state = await loadState();
    const accounts = customerAccountMap(state);
    delete accounts[current.email];
    accounts[next.email] = next;
    state.customerAccounts = accounts;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return next;
  }

  async function listCustomerTickets(id) {
    const customer = await getCustomer(id);
    if (!customer) return null;
    const tickets = await ticketCollection();
    return tickets.filter((ticket) => normalizeEmail(ticket.customer?.email) === customer.email);
  }

  async function addCustomerNote(id, input) {
    return addCustomerChild(id, "accountNotes", {
      id: input.id || randomUUID(),
      body: String(input.body || ""),
      rep: input.rep || input.author || "System",
      timestamp: input.timestamp || new Date().toISOString()
    });
  }

  async function addCustomerReceipt(id, input) {
    return addCustomerChild(id, "receipts", {
      ...input,
      id: input.id || randomUUID(),
      savedAt: input.savedAt || input.uploadDate || new Date().toISOString(),
      uploadDate: input.uploadDate || input.savedAt || new Date().toISOString()
    });
  }

  async function addCustomerWarranty(id, input) {
    return addCustomerChild(id, "warranties", {
      ...input,
      id: input.id || randomUUID(),
      status: input.status || "Not registered"
    });
  }

  async function addCustomerChild(id, collection, record) {
    const customer = await getCustomer(id);
    if (!customer) return null;
    const state = await loadState();
    const accounts = customerAccountMap(state);
    const next = normalizeCustomer(accounts[customer.email] || customer);
    next[collection] = Array.isArray(next[collection]) ? next[collection] : [];
    next[collection].unshift(record);
    accounts[next.email] = next;
    state.customerAccounts = accounts;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return { customer: next, record };
  }

  async function ticketCollection() {
    const state = await loadState();
    return Array.isArray(state.tickets) ? [...state.tickets] : [];
  }

  async function replaceTickets(tickets) {
    await setResource("tickets", tickets);
  }

  async function customerCollection() {
    const state = await loadState();
    return Object.values(customerAccountMap(state)).map(normalizeCustomer);
  }
}

export function filterTickets(tickets, filters = {}) {
  const status = String(filters.status || "").trim().toLowerCase();
  const assignee = String(filters.assignee || "").trim().toLowerCase();
  const search = String(filters.search || "").trim().toLowerCase();
  const limit = clampInt(filters.limit, 1, 500, 100);
  const offset = clampInt(filters.offset, 0, 100000, 0);

  return tickets
    .filter((ticket) => !status || String(ticket.status || "").toLowerCase() === status)
    .filter((ticket) => !assignee || String(ticket.assignee || "").toLowerCase() === assignee)
    .filter((ticket) => !search || ticketSearchText(ticket).includes(search))
    .slice(offset, offset + limit);
}

function ticketSearchText(ticket) {
  return [
    ticket.id,
    ticket.subject,
    ticket.status,
    ticket.assignee,
    ticket.model,
    ticket.family,
    ticket.source,
    ticket.purchaseSource,
    ticket.customer?.name,
    ticket.customer?.email
  ].filter(Boolean).join(" ").toLowerCase();
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function filterCustomers(customers, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const limit = clampInt(filters.limit, 1, 500, 100);
  const offset = clampInt(filters.offset, 0, 100000, 0);
  return customers
    .filter((customer) => !search || customerSearchText(customer).includes(search))
    .slice(offset, offset + limit);
}

export function normalizeCustomer(input = {}) {
  const email = normalizeEmail(input.email);
  return {
    ...input,
    id: String(input.id || email || randomUUID()),
    email,
    name: String(input.name || ""),
    phone: String(input.phone || ""),
    mobile: String(input.mobile || ""),
    address: String(input.address || ""),
    purchaseSource: String(input.purchaseSource || "Unknown"),
    orderNumber: String(input.orderNumber || ""),
    notes: String(input.notes || ""),
    receipts: Array.isArray(input.receipts) ? input.receipts : [],
    warranties: Array.isArray(input.warranties) ? input.warranties : [],
    accountNotes: Array.isArray(input.accountNotes) ? input.accountNotes : [],
    warrantyRegistered: Boolean(input.warrantyRegistered),
    warrantyRegisteredAt: String(input.warrantyRegisteredAt || "")
  };
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function customerAccountMap(state) {
  return state.customerAccounts && typeof state.customerAccounts === "object" && !Array.isArray(state.customerAccounts)
    ? { ...state.customerAccounts }
    : {};
}

function customerMatchesId(customer, id) {
  const value = String(id || "").trim().toLowerCase();
  return customer.id.toLowerCase() === value || customer.email === value;
}

function customerSearchText(customer) {
  return [
    customer.id,
    customer.email,
    customer.name,
    customer.phone,
    customer.orderNumber,
    customer.purchaseSource,
    customer.notes
  ].filter(Boolean).join(" ").toLowerCase();
}
