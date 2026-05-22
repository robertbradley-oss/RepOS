import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { filterCustomers, filterTickets, normalizeCustomer, normalizeEmail } from "./json-store.mjs";

const { Pool } = pg;

export async function createPostgresStore({ databaseUrl, schemaPath, defaultState }) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
  });
  globalThis.__tessarioPgPool = pool;

  if (process.env.TESSARIO_AUTO_MIGRATE !== "0") {
    const schema = await readFile(schemaPath, "utf8");
    await pool.query(schema);
  }

  return {
    mode: "postgres",
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
    addCustomerWarranty,
    createFileRecord,
    getFileRecord,
    listFileRecords
  };

  async function loadState() {
    const state = defaultState();
    const rows = await pool.query("select resource, value from app_state");
    for (const row of rows.rows) state[row.resource] = row.value;
    const tickets = await listTickets({ limit: 500 });
    if (tickets.length) state.tickets = tickets;
    const files = await listFileRecords({ limit: 500 });
    if (files.length) state.fileRecords = files;
    return state;
  }

  async function saveState(state) {
    const entries = Object.entries(state).filter(([key]) => key !== "createdAt" && key !== "updatedAt" && key !== "version");
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const [resource, value] of entries) {
        await upsertResource(client, resource, value);
      }
      if (Array.isArray(state.tickets)) await replaceTickets(client, state.tickets);
      if (state.customerAccounts && typeof state.customerAccounts === "object" && !Array.isArray(state.customerAccounts)) await replaceCustomers(client, state.customerAccounts);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function getResource(resource) {
    if (resource === "tickets") return listTickets({ limit: 500 });
    const result = await pool.query("select value from app_state where resource = $1", [resource]);
    return result.rows[0]?.value ?? null;
  }

  async function setResource(resource, value) {
    const updatedAt = new Date().toISOString();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await upsertResource(client, resource, value);
      if (resource === "tickets" && Array.isArray(value)) await replaceTickets(client, value);
      if (resource === "customerAccounts" && value && typeof value === "object" && !Array.isArray(value)) await replaceCustomers(client, value);
      await client.query("commit");
      return updatedAt;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function resetState() {
    const state = defaultState();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("delete from ticket_messages");
      await client.query("delete from tickets");
      await client.query("delete from uploaded_files");
      await client.query("delete from app_state");
      await client.query("commit");
      return state;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async function listTickets(filters = {}) {
    const result = await pool.query("select * from tickets order by updated_at desc nulls last, created_at desc nulls last limit 1000");
    return filterTickets(result.rows.map(ticketFromRow), filters);
  }

  async function getTicket(id) {
    const result = await pool.query("select * from tickets where id = $1", [String(id)]);
    return result.rows[0] ? ticketFromRow(result.rows[0]) : null;
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
    await upsertTicket(pool, ticket);
    return ticket;
  }

  async function patchTicket(id, patch) {
    const current = await getTicket(id);
    if (!current) return null;
    const ticket = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString()
    };
    await upsertTicket(pool, ticket);
    return ticket;
  }

  async function appendTicketMessage(id, input) {
    const current = await getTicket(id);
    if (!current) return null;
    const message = {
      id: input.id || randomUUID(),
      type: input.type || "note",
      author: input.author || "System",
      timestamp: input.timestamp || new Date().toISOString(),
      body: input.body || ""
    };
    const ticket = {
      ...current,
      updatedAt: new Date().toISOString(),
      conversation: [...(Array.isArray(current.conversation) ? current.conversation : []), message]
    };
    const client = await pool.connect();
    try {
      await client.query("begin");
      await upsertTicket(client, ticket);
      await client.query(
        `insert into ticket_messages (id, ticket_id, message_type, author, body, created_at, data)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set
           message_type = excluded.message_type,
           author = excluded.author,
           body = excluded.body,
           created_at = excluded.created_at,
           data = excluded.data`,
        [message.id, ticket.id, message.type, message.author, message.body, message.timestamp, message]
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return { ticket, message };
  }

  async function ensureAuthUser(user) {
    const now = new Date().toISOString();
    const record = {
      ...user,
      id: user.id || randomUUID(),
      active: user.active !== false,
      createdAt: user.createdAt || now,
      updatedAt: now
    };
    const result = await pool.query(
      `insert into auth_users (id, email, display_name, role, rep_name, active, created_at, updated_at, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (email) do update set
         display_name = excluded.display_name,
         role = excluded.role,
         rep_name = excluded.rep_name,
         active = excluded.active,
         updated_at = excluded.updated_at,
         data = excluded.data
       returning *`,
      [
        record.id,
        record.email,
        record.displayName,
        record.role,
        record.repName || record.displayName,
        record.active,
        record.createdAt,
        record.updatedAt,
        record
      ]
    );
    return authUserFromRow(result.rows[0]);
  }

  async function listAuthUsers() {
    const result = await pool.query("select * from auth_users order by display_name");
    return result.rows.map(authUserFromRow);
  }

  async function findAuthUserByEmail(email) {
    const result = await pool.query("select * from auth_users where email = $1", [email]);
    return result.rows[0] ? authUserFromRow(result.rows[0]) : null;
  }

  async function getAuthSession(token) {
    const result = await pool.query(
      `select s.token, s.user_id, s.created_at as session_created_at, s.expires_at, u.*
       from auth_sessions s
       join auth_users u on u.id = s.user_id
       where s.token = $1 and s.expires_at > now() and u.active = true`,
      [token]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      session: {
        token: row.token,
        userId: row.user_id,
        createdAt: row.session_created_at?.toISOString?.() || "",
        expiresAt: row.expires_at?.toISOString?.() || ""
      },
      user: authUserFromRow(row)
    };
  }

  async function createAuthSession(userId, { token, expiresAt }) {
    const result = await pool.query(
      `insert into auth_sessions (token, user_id, expires_at)
       values ($1, $2, $3)
       on conflict (token) do update set user_id = excluded.user_id, expires_at = excluded.expires_at
       returning *`,
      [token, userId, expiresAt]
    );
    const row = result.rows[0];
    return {
      token: row.token,
      userId: row.user_id,
      createdAt: row.created_at?.toISOString?.() || "",
      expiresAt: row.expires_at?.toISOString?.() || ""
    };
  }

  async function deleteAuthSession(token) {
    await pool.query("delete from auth_sessions where token = $1", [token]);
  }

  async function listCustomers(filters = {}) {
    const result = await pool.query("select * from customers order by updated_at desc limit 1000");
    return filterCustomers(await hydrateCustomers(result.rows.map(customerFromRow)), filters);
  }

  async function getCustomer(id) {
    const value = normalizeEmail(id);
    const result = await pool.query("select * from customers where id = $1 or email = $2", [String(id), value]);
    const customers = await hydrateCustomers(result.rows.map(customerFromRow));
    return customers[0] || null;
  }

  async function createCustomer(input) {
    const customer = normalizeCustomer(input);
    if (!customer.email) return null;
    await upsertCustomer(pool, customer);
    return getCustomer(customer.email);
  }

  async function patchCustomer(id, patch) {
    const current = await getCustomer(id);
    if (!current) return null;
    const next = normalizeCustomer({ ...current, ...patch, email: patch.email || current.email, id: current.id });
    await upsertCustomer(pool, next);
    return getCustomer(next.id);
  }

  async function listCustomerTickets(id) {
    const customer = await getCustomer(id);
    if (!customer) return null;
    const result = await pool.query("select * from tickets where lower(customer_email) = $1 order by updated_at desc nulls last", [customer.email]);
    return result.rows.map(ticketFromRow);
  }

  async function addCustomerNote(id, input) {
    return addCustomerChild(id, "note", {
      id: input.id || randomUUID(),
      body: String(input.body || ""),
      rep: input.rep || input.author || "System",
      timestamp: input.timestamp || new Date().toISOString()
    });
  }

  async function addCustomerReceipt(id, input) {
    return addCustomerChild(id, "receipt", {
      ...input,
      id: input.id || randomUUID(),
      savedAt: input.savedAt || input.uploadDate || new Date().toISOString(),
      uploadDate: input.uploadDate || input.savedAt || new Date().toISOString()
    });
  }

  async function addCustomerWarranty(id, input) {
    return addCustomerChild(id, "warranty", {
      ...input,
      id: input.id || randomUUID(),
      status: input.status || "Not registered"
    });
  }

  async function addCustomerChild(id, type, record) {
    const customer = await getCustomer(id);
    if (!customer) return null;
    if (type === "note") await upsertCustomerNote(pool, customer.id, record);
    if (type === "receipt") await upsertCustomerReceipt(pool, customer.id, record);
    if (type === "warranty") await upsertCustomerWarranty(pool, customer.id, record);
    return { customer: await getCustomer(customer.id), record };
  }

  async function createFileRecord(input) {
    const now = new Date().toISOString();
    const record = {
      ...input,
      id: input.id || randomUUID(),
      category: String(input.category || ""),
      ownerType: String(input.ownerType || ""),
      ownerId: String(input.ownerId || ""),
      originalName: String(input.originalName || ""),
      storedName: String(input.storedName || ""),
      storagePath: String(input.storagePath || ""),
      mimeType: String(input.mimeType || "application/octet-stream"),
      sizeBytes: Number(input.sizeBytes || input.size || 0),
      uploadedBy: String(input.uploadedBy || ""),
      createdAt: input.createdAt || now
    };
    const result = await pool.query(
      `insert into uploaded_files (
         id, category, owner_type, owner_id, original_name, stored_name, storage_path,
         mime_type, size_bytes, uploaded_by, created_at, data
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update set
         category = excluded.category,
         owner_type = excluded.owner_type,
         owner_id = excluded.owner_id,
         original_name = excluded.original_name,
         stored_name = excluded.stored_name,
         storage_path = excluded.storage_path,
         mime_type = excluded.mime_type,
         size_bytes = excluded.size_bytes,
         uploaded_by = excluded.uploaded_by,
         created_at = excluded.created_at,
         data = excluded.data
       returning *`,
      [
        record.id,
        record.category,
        record.ownerType,
        record.ownerId,
        record.originalName,
        record.storedName,
        record.storagePath,
        record.mimeType,
        record.sizeBytes,
        record.uploadedBy,
        record.createdAt,
        record
      ]
    );
    return fileRecordFromRow(result.rows[0]);
  }

  async function getFileRecord(id) {
    const result = await pool.query("select * from uploaded_files where id = $1", [String(id)]);
    return result.rows[0] ? fileRecordFromRow(result.rows[0]) : null;
  }

  async function listFileRecords(filters = {}) {
    const category = String(filters.category || "").trim();
    const ownerType = String(filters.ownerType || "").trim();
    const ownerId = String(filters.ownerId || "").trim();
    const result = await pool.query(
      `select * from uploaded_files
       where ($1 = '' or category = $1)
         and ($2 = '' or owner_type = $2)
         and ($3 = '' or owner_id = $3)
       order by created_at desc
       limit $4 offset $5`,
      [category, ownerType, ownerId, clampInt(filters.limit, 1, 10000, 500), clampInt(filters.offset, 0, 100000, 0)]
    );
    return result.rows.map(fileRecordFromRow);
  }

  async function replaceTickets(client, tickets) {
    await client.query("delete from ticket_messages");
    await client.query("delete from tickets");
    for (const ticket of tickets) await upsertTicket(client, ticket);
  }

  async function upsertResource(client, resource, value) {
    await client.query(
      `insert into app_state (resource, value, updated_at)
       values ($1, $2, now())
       on conflict (resource) do update set value = excluded.value, updated_at = now()`,
      [resource, JSON.stringify(value)]
    );
  }

  async function replaceCustomers(client, customerAccounts) {
    await client.query("delete from customer_warranties");
    await client.query("delete from customer_receipts");
    await client.query("delete from customer_notes");
    await client.query("delete from customers");
    for (const account of Object.values(customerAccounts)) {
      const customer = normalizeCustomer(account);
      if (!customer.email) continue;
      await upsertCustomer(client, customer);
    }
  }
}

async function upsertTicket(clientOrPool, ticket) {
  await clientOrPool.query(
    `insert into tickets (
       id, ticket_number, subject, status, priority, assignee, customer_name, customer_email,
       model, family, source, purchase_source, created_at, updated_at, due_at, data
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     on conflict (id) do update set
       ticket_number = excluded.ticket_number,
       subject = excluded.subject,
       status = excluded.status,
       priority = excluded.priority,
       assignee = excluded.assignee,
       customer_name = excluded.customer_name,
       customer_email = excluded.customer_email,
       model = excluded.model,
       family = excluded.family,
       source = excluded.source,
       purchase_source = excluded.purchase_source,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       due_at = excluded.due_at,
       data = excluded.data`,
    [
      String(ticket.id),
      ticketNumberFromId(ticket.id),
      ticket.subject || "",
      ticket.status || "",
      ticket.priority || "",
      ticket.assignee || "",
      ticket.customer?.name || "",
      ticket.customer?.email || "",
      ticket.model || "",
      ticket.family || "",
      ticket.source || "",
      ticket.purchaseSource || "",
      nullableDate(ticket.createdAt),
      nullableDate(ticket.updatedAt || ticket.createdAt),
      nullableDate(ticket.dueAt),
      ticket
    ]
  );
}

function ticketFromRow(row) {
  return {
    ...(row.data || {}),
    id: row.id,
    subject: row.subject || row.data?.subject || "",
    status: row.status || row.data?.status || "",
    priority: row.priority || row.data?.priority || "",
    assignee: row.assignee || row.data?.assignee || "",
    model: row.model || row.data?.model || "",
    family: row.family || row.data?.family || "",
    source: row.source || row.data?.source || "",
    purchaseSource: row.purchase_source || row.data?.purchaseSource || "",
    createdAt: row.created_at?.toISOString?.() || row.data?.createdAt || "",
    updatedAt: row.updated_at?.toISOString?.() || row.data?.updatedAt || "",
    dueAt: row.due_at?.toISOString?.() || row.data?.dueAt || ""
  };
}

function ticketNumberFromId(id) {
  const match = String(id || "").match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function nullableDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function authUserFromRow(row) {
  return {
    ...(row.data || {}),
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.data?.displayName || "",
    role: row.role || row.data?.role || "rep",
    repName: row.rep_name || row.data?.repName || "",
    active: row.active !== false,
    createdAt: row.created_at?.toISOString?.() || row.data?.createdAt || "",
    updatedAt: row.updated_at?.toISOString?.() || row.data?.updatedAt || ""
  };
}

async function upsertCustomer(clientOrPool, customerInput) {
  const customer = normalizeCustomer(customerInput);
  await clientOrPool.query(
    `insert into customers (
       id, email, name, phone, mobile, address, purchase_source, order_number, notes,
       warranty_registered, warranty_registered_at, updated_at, data
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12)
     on conflict (email) do update set
       name = excluded.name,
       phone = excluded.phone,
       mobile = excluded.mobile,
       address = excluded.address,
       purchase_source = excluded.purchase_source,
       order_number = excluded.order_number,
       notes = excluded.notes,
       warranty_registered = excluded.warranty_registered,
       warranty_registered_at = excluded.warranty_registered_at,
       updated_at = now(),
       data = excluded.data`,
    [
      customer.id,
      customer.email,
      customer.name,
      customer.phone,
      customer.mobile,
      customer.address,
      customer.purchaseSource,
      customer.orderNumber,
      customer.notes,
      customer.warrantyRegistered,
      nullableDate(customer.warrantyRegisteredAt),
      customer
    ]
  );
  const saved = await clientOrPool.query("select id from customers where email = $1", [customer.email]);
  const customerId = saved.rows[0]?.id || customer.id;
  for (const note of customer.accountNotes || []) await upsertCustomerNote(clientOrPool, customerId, note);
  for (const receipt of customer.receipts || []) await upsertCustomerReceipt(clientOrPool, customerId, receipt);
  for (const warranty of customer.warranties || []) await upsertCustomerWarranty(clientOrPool, customerId, warranty);
}

async function upsertCustomerNote(clientOrPool, customerId, note) {
  await clientOrPool.query(
    `insert into customer_notes (id, customer_id, body, rep, created_at, data)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set body = excluded.body, rep = excluded.rep, created_at = excluded.created_at, data = excluded.data`,
    [note.id || randomUUID(), customerId, note.body || "", note.rep || note.author || "", nullableDate(note.timestamp) || new Date().toISOString(), note]
  );
}

async function upsertCustomerReceipt(clientOrPool, customerId, receipt) {
  await clientOrPool.query(
    `insert into customer_receipts (id, customer_id, file_name, source, order_number, model, status, uploaded_at, data)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (id) do update set
       file_name = excluded.file_name,
       source = excluded.source,
       order_number = excluded.order_number,
       model = excluded.model,
       status = excluded.status,
       uploaded_at = excluded.uploaded_at,
       data = excluded.data`,
    [
      receipt.id || randomUUID(),
      customerId,
      receipt.fileName || "",
      receipt.source || "Unknown",
      receipt.orderNumber || "",
      receipt.model || "",
      receipt.status || "",
      nullableDate(receipt.uploadDate || receipt.savedAt),
      receipt
    ]
  );
}

async function upsertCustomerWarranty(clientOrPool, customerId, warranty) {
  await clientOrPool.query(
    `insert into customer_warranties (id, customer_id, receipt_id, model, order_number, status, registered_at, data)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do update set
       receipt_id = excluded.receipt_id,
       model = excluded.model,
       order_number = excluded.order_number,
       status = excluded.status,
       registered_at = excluded.registered_at,
       data = excluded.data`,
    [
      warranty.id || randomUUID(),
      customerId,
      warranty.receiptId || "",
      warranty.model || "",
      warranty.orderNumber || "",
      warranty.status || "",
      nullableDate(warranty.registeredAt),
      warranty
    ]
  );
}

async function hydrateCustomers(customers) {
  if (!customers.length) return [];
  const ids = customers.map((customer) => customer.id);
  const [notes, receipts, warranties] = await Promise.all([
    queryCustomerChildren("customer_notes", ids),
    queryCustomerChildren("customer_receipts", ids),
    queryCustomerChildren("customer_warranties", ids)
  ]);
  return customers.map((customer) => ({
    ...customer,
    accountNotes: notes.filter((row) => row.customer_id === customer.id).map((row) => row.data || {}),
    receipts: receipts.filter((row) => row.customer_id === customer.id).map((row) => row.data || {}),
    warranties: warranties.filter((row) => row.customer_id === customer.id).map((row) => row.data || {})
  }));
}

async function queryCustomerChildren(table, ids) {
  if (!ids.length) return [];
  const pool = globalThis.__tessarioPgPool;
  if (!pool) return [];
  const result = await pool.query(`select * from ${table} where customer_id = any($1)`, [ids]);
  return result.rows;
}

function customerFromRow(row) {
  return normalizeCustomer({
    ...(row.data || {}),
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    mobile: row.mobile,
    address: row.address,
    purchaseSource: row.purchase_source,
    orderNumber: row.order_number,
    notes: row.notes,
    warrantyRegistered: row.warranty_registered,
    warrantyRegisteredAt: row.warranty_registered_at?.toISOString?.() || ""
  });
}

function fileRecordFromRow(row) {
  return {
    ...(row.data || {}),
    id: row.id,
    category: row.category || row.data?.category || "",
    ownerType: row.owner_type || row.data?.ownerType || "",
    ownerId: row.owner_id || row.data?.ownerId || "",
    originalName: row.original_name || row.data?.originalName || "",
    storedName: row.stored_name || row.data?.storedName || "",
    storagePath: row.storage_path || row.data?.storagePath || "",
    mimeType: row.mime_type || row.data?.mimeType || "application/octet-stream",
    sizeBytes: row.size_bytes ?? row.data?.sizeBytes ?? 0,
    uploadedBy: row.uploaded_by || row.data?.uploadedBy || "",
    createdAt: row.created_at?.toISOString?.() || row.data?.createdAt || ""
  };
}
