create table if not exists app_state (
  resource text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists tickets (
  id text primary key,
  ticket_number integer,
  subject text not null default '',
  status text not null default '',
  priority text not null default '',
  assignee text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  model text not null default '',
  family text not null default '',
  source text not null default '',
  purchase_source text not null default '',
  created_at timestamptz,
  updated_at timestamptz,
  due_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create index if not exists tickets_status_idx on tickets (status);
create index if not exists tickets_assignee_idx on tickets (assignee);
create index if not exists tickets_customer_email_idx on tickets (customer_email);
create index if not exists tickets_updated_at_idx on tickets (updated_at desc);

create table if not exists ticket_messages (
  id text primary key,
  ticket_id text not null references tickets(id) on delete cascade,
  message_type text not null default 'note',
  author text not null default '',
  body text not null default '',
  created_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create index if not exists ticket_messages_ticket_id_idx on ticket_messages (ticket_id);
create index if not exists ticket_messages_created_at_idx on ticket_messages (created_at);

create table if not exists auth_users (
  id text primary key,
  email text not null unique,
  display_name text not null default '',
  role text not null default 'rep',
  rep_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists auth_users_role_idx on auth_users (role);
create index if not exists auth_users_active_idx on auth_users (active);

create table if not exists auth_sessions (
  token text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions (expires_at);

create table if not exists customers (
  id text primary key,
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  mobile text not null default '',
  address text not null default '',
  purchase_source text not null default 'Unknown',
  order_number text not null default '',
  notes text not null default '',
  warranty_registered boolean not null default false,
  warranty_registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists customers_email_idx on customers (email);
create index if not exists customers_name_idx on customers (name);

create table if not exists customer_notes (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  body text not null default '',
  rep text not null default '',
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists customer_receipts (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  file_name text not null default '',
  source text not null default 'Unknown',
  order_number text not null default '',
  model text not null default '',
  status text not null default '',
  uploaded_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create table if not exists customer_warranties (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  receipt_id text,
  model text not null default '',
  order_number text not null default '',
  status text not null default '',
  registered_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

create index if not exists customer_notes_customer_id_idx on customer_notes (customer_id);
create index if not exists customer_receipts_customer_id_idx on customer_receipts (customer_id);
create index if not exists customer_warranties_customer_id_idx on customer_warranties (customer_id);
