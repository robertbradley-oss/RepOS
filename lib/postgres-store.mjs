import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { filterTickets } from "./json-store.mjs";

const { Pool } = pg;

export async function createPostgresStore({ databaseUrl, schemaPath, defaultState }) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
  });

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
    deleteAuthSession
  };

  async function loadState() {
    const state = defaultState();
    const rows = await pool.query("select resource, value from app_state");
    for (const row of rows.rows) state[row.resource] = row.value;
    const tickets = await listTickets({ limit: 500 });
    if (tickets.length) state.tickets = tickets;
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
