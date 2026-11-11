-- Capital O2 Estates & Hostel (single company, independent of Efie Wura). Own schema "capitalo2" so it can share a Supabase project safely.
-- Clients read/write ordinary records under row-level security; anything that moves money
-- (payments, wallet, withdrawals, plan charges) only happens inside the functions below.

create schema if not exists capitalo2;
grant usage on schema capitalo2 to anon, authenticated, service_role;
set search_path = capitalo2, public;

-- ------------------------------------------------------------------ tables
create table capitalo2.config (
  id boolean primary key default true check (id),
  platform jsonb not null
);
insert into capitalo2.config (platform) values ('{
  "name": "Capital O2 Estates & Hostel", "feePct": 0, "minWithdraw": 0, "autoLimit": 0, "graceDays": 5, "testMode": true, "smsDailyLimit": 300, "single": true,
  "plans": [{"id": "capitalo2", "name": "Capital O2", "price": 0, "units": 100000, "perks": []}]}');

-- Never readable by clients.
create table capitalo2.secrets (
  id boolean primary key default true check (id),
  reserved_admin_email text not null default 'nyamebabaku@gmail.com',
  hook_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  functions_url text not null default 'https://jepkzvunetajsgscoelv.supabase.co/functions/v1'
);
insert into capitalo2.secrets default values;

create table capitalo2.owners (
  id text primary key default 'o_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  plan text not null default 'capitalo2',
  plan_renews date,
  provider text not null default 'paystack' check (provider in ('paystack', 'hubtel')),
  data jsonb not null default '{}',          -- brand + public business details + rent settings
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- Owner-only details (Ghana Card / registration, payout accounts): staff and tenants never see these.
create table capitalo2.owner_private (
  owner_id text primary key references capitalo2.owners on delete cascade,
  data jsonb not null default '{}'
);

-- The one company this app serves.
insert into capitalo2.owners (id, code, status, plan, provider, data) values ('capitalo2', 'CAPO2', 'approved', 'capitalo2', 'paystack', jsonb_build_object(
  'company', 'Capital O2 Estates & Hostel', 'tagline', 'Estates & Hostel · Comfortable living', 'contactName', 'Capital O2 Estates & Hostel',
  'phone', '', 'email', '', 'address', 'Ghana',
  'logo', './capitalo2-badge.png', 'logoWide', './capitalo2-logo.png', 'frontImage', '', 'setupDone', true,
  'theme', jsonb_build_object('brand', '#2e7d32', 'accent', '#9bd21c', 'font', 'Fraunces', 'radius', 'rounded', 'sidebar', 'dark', 'dark', false),
  'settings', jsonb_build_object('graceDays', 5, 'lateFeePct', 0, 'autoReminders', true, 'reminderDays', 3, 'smsSender', 'CAPITAL O2', 'templates', jsonb_build_object(
    'reminder', 'Hello {name}, your rent of {amount} for {unit} is due on {due}. Pay easily with MoMo in the Capital O2 Hostel app. Thank you.',
    'overdue', 'Dear {name}, your rent balance of {amount} for {unit} is overdue. Kindly pay today. – Capital O2 Estates & Hostel',
    'receipt', 'Payment received: {amount} for {unit}. Receipt {ref}. Thank you, {name}! – Capital O2 Estates & Hostel',
    'expiry', 'Hello {name}, your tenancy for {unit} ends on {due}. Please contact our office to renew. – Capital O2 Estates & Hostel'))));
insert into capitalo2.owner_private (owner_id, data) values ('capitalo2', '{"kyc": {}, "payoutAccounts": []}');

create table capitalo2.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('owner', 'manager', 'tenant', 'admin')),
  owner_id text references capitalo2.owners on delete cascade,
  tenant_id text,
  name text not null,
  phone text,
  email text,
  title text,
  property_ids text[] not null default '{}',
  perms jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  check ((role = 'admin') = (owner_id is null))
);
create index profiles_owner on capitalo2.profiles (owner_id);

create table capitalo2.records (
  owner_id text not null references capitalo2.owners on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (owner_id, col, id)
);
create index records_tenant on capitalo2.records (owner_id, col, (data->>'tenantId'));

create table capitalo2.checkouts (
  id text primary key default 'ck_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  owner_id text not null references capitalo2.owners on delete cascade,
  tenant_id text,
  kind text not null default 'rent' check (kind in ('rent', 'plan')),
  plan text,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('mtn', 'telecel', 'at', 'card')),
  payer text,
  invoice_ids text[] not null default '{}',
  provider text not null,
  test boolean not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  provider_ref text,
  pay_url text,
  error text,
  payment_id text,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index checkouts_owner on capitalo2.checkouts (owner_id, created_at desc);

-- ------------------------------------------------------------------ helpers
create or replace function capitalo2.me() returns capitalo2.profiles
language sql stable security definer set search_path = capitalo2, public as $$
  select * from capitalo2.profiles where user_id = auth.uid() and status = 'active'
$$;
create or replace function capitalo2.is_admin() returns boolean
language sql stable security definer set search_path = capitalo2, public as $$
  select exists (select 1 from capitalo2.profiles where user_id = auth.uid() and role = 'admin' and status = 'active')
$$;
create or replace function capitalo2.is_server() returns boolean language sql stable as $$
  select coalesce(current_setting('capitalo2.server', true), '') = 'on' or coalesce(auth.role(), '') = 'service_role'
$$;
create or replace function capitalo2.rid(prefix text) returns text language sql volatile as $$
  select prefix || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14)
$$;
create or replace function capitalo2.platform() returns jsonb language sql stable security definer set search_path = capitalo2, public as $$
  select platform from capitalo2.config
$$;

/** Can the signed-in account read this record? */
create or replace function capitalo2.can_read(p_owner text, p_col text, p_id text, p_data jsonb) returns boolean
language plpgsql stable security definer set search_path = capitalo2, public as $$
declare m capitalo2.profiles; pid text := coalesce(p_data->>'propertyId', '');
begin
  select * into m from capitalo2.profiles where user_id = auth.uid() and status = 'active';
  if m is null then return false; end if;
  if m.role = 'admin' then return true; end if;
  if m.owner_id is distinct from p_owner then return false; end if;
  if m.role = 'owner' then return true; end if;
  if m.role = 'manager' then
    if p_col in ('withdrawals', 'subscriptions') then return false; end if;
    if p_col = 'properties' then return p_id = any (m.property_ids); end if;
    return pid = '' or pid = any (m.property_ids);
  end if;
  -- tenant
  if p_col = 'tenants' then return p_id = m.tenant_id; end if;
  if p_col in ('leases', 'invoices', 'payments', 'maintenance') then return p_data->>'tenantId' = m.tenant_id; end if;
  if p_col = 'units' then
    return exists (select 1 from capitalo2.records l where l.owner_id = p_owner and l.col = 'leases' and l.data->>'tenantId' = m.tenant_id and l.data->>'unitId' = p_id);
  end if;
  if p_col in ('properties', 'notices') then
    if p_col = 'notices' and pid = '' then return true; end if;
    return exists (select 1 from capitalo2.records l join capitalo2.records u on u.owner_id = l.owner_id and u.col = 'units' and u.id = l.data->>'unitId'
                   where l.owner_id = p_owner and l.col = 'leases' and l.data->>'tenantId' = m.tenant_id
                     and u.data->>'propertyId' = case when p_col = 'properties' then p_id else pid end);
  end if;
  return false;
end $$;

/** Can the signed-in account create / change / delete this record directly? (Money records: never.) */
create or replace function capitalo2.can_write(p_owner text, p_col text, p_data jsonb) returns boolean
language plpgsql stable security definer set search_path = capitalo2, public as $$
declare m capitalo2.profiles; pid text := coalesce(p_data->>'propertyId', '');
begin
  if capitalo2.is_server() then return true; end if;
  select * into m from capitalo2.profiles where user_id = auth.uid() and status = 'active';
  if m is null or m.role = 'tenant' then return false; end if;
  if m.role = 'admin' then return p_col not in ('payments', 'withdrawals', 'subscriptions', 'sms'); end if;
  if m.owner_id is distinct from p_owner then return false; end if;
  if (select status from capitalo2.owners where id = p_owner) = 'suspended' then return false; end if;
  if m.role = 'owner' then
    return p_col in ('properties', 'units', 'tenants', 'leases', 'invoices', 'maintenance', 'expenses', 'notices', 'invites', 'alerts');
  end if;
  -- manager: only their properties, only what their permissions allow
  if pid <> '' and not pid = any (m.property_ids) then return false; end if;
  return case p_col
    when 'tenants' then coalesce((m.perms->>'tenants')::boolean, false)
    when 'leases' then coalesce((m.perms->>'tenants')::boolean, false)
    when 'units' then coalesce((m.perms->>'tenants')::boolean, false)
    when 'invoices' then coalesce((m.perms->>'payments')::boolean, false)
    when 'maintenance' then coalesce((m.perms->>'maintenance')::boolean, false)
    when 'expenses' then coalesce((m.perms->>'expenses')::boolean, false)
    when 'notices' then true
    when 'alerts' then true
    else false end;
end $$;

-- Guards: clients can never set an invoice's paid amount, forge a tenant signature or change owner status/plan.
create or replace function capitalo2.guard_records() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.data := new.data || jsonb_build_object('id', new.id, 'ownerId', new.owner_id);
  if capitalo2.is_server() then return new; end if;
  if new.col = 'invoices' then
    new.data := jsonb_set(new.data, '{paid}', case when tg_op = 'UPDATE' then coalesce(old.data->'paid', '0') else '0' end);
  elsif new.col = 'leases' then
    new.data := jsonb_set(new.data, '{signedTenant}', case when tg_op = 'UPDATE' then coalesce(old.data->'signedTenant', 'null') else 'null' end);
  end if;
  return new;
end $$;
create trigger records_guard before insert or update on capitalo2.records for each row execute function capitalo2.guard_records();

create or replace function capitalo2.guard_owners() returns trigger language plpgsql as $$
begin
  if capitalo2.is_server() or capitalo2.is_admin() then return new; end if;
  new.status := old.status; new.plan := old.plan; new.plan_renews := old.plan_renews; new.code := old.code; new.created_by := old.created_by;
  return new;
end $$;
create trigger owners_guard before update on capitalo2.owners for each row execute function capitalo2.guard_owners();

-- ------------------------------------------------------------------ row-level security
alter table capitalo2.config enable row level security;
alter table capitalo2.secrets enable row level security;
alter table capitalo2.owners enable row level security;
alter table capitalo2.owner_private enable row level security;
alter table capitalo2.profiles enable row level security;
alter table capitalo2.records enable row level security;
alter table capitalo2.checkouts enable row level security;

create policy config_read on capitalo2.config for select using (true);
create policy owners_read on capitalo2.owners for select using (capitalo2.is_admin() or id = (capitalo2.me()).owner_id);
create policy owners_write on capitalo2.owners for update
  using (capitalo2.is_admin() or (id = (capitalo2.me()).owner_id and (capitalo2.me()).role = 'owner'))
  with check (capitalo2.is_admin() or (id = (capitalo2.me()).owner_id and (capitalo2.me()).role = 'owner'));
create policy private_all on capitalo2.owner_private for all
  using (capitalo2.is_admin() or (owner_id = (capitalo2.me()).owner_id and (capitalo2.me()).role = 'owner'))
  with check (capitalo2.is_admin() or (owner_id = (capitalo2.me()).owner_id and (capitalo2.me()).role = 'owner'));
create policy profiles_read on capitalo2.profiles for select using (
  user_id = auth.uid() or capitalo2.is_admin() or (owner_id = (capitalo2.me()).owner_id and (capitalo2.me()).role in ('owner', 'manager')));
create policy records_read on capitalo2.records for select using (capitalo2.can_read(owner_id, col, id, data));
create policy records_insert on capitalo2.records for insert with check (capitalo2.can_write(owner_id, col, data));
create policy records_update on capitalo2.records for update using (capitalo2.can_write(owner_id, col, data)) with check (capitalo2.can_write(owner_id, col, data));
create policy records_delete on capitalo2.records for delete using (capitalo2.can_write(owner_id, col, data) and col not in ('invoices', 'leases') or capitalo2.is_admin());
create policy checkouts_read on capitalo2.checkouts for select using (
  created_by = auth.uid() or capitalo2.is_admin() or (owner_id = (capitalo2.me()).owner_id and (capitalo2.me()).role = 'owner'));

grant select on capitalo2.config to anon, authenticated;
grant select, update on capitalo2.owners to authenticated;
grant select, insert, update on capitalo2.owner_private to authenticated;
grant select on capitalo2.profiles to authenticated;
grant select, insert, update, delete on capitalo2.records to authenticated;
grant select on capitalo2.checkouts to authenticated;
grant all on all tables in schema capitalo2 to service_role;
