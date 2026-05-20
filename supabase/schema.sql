create extension if not exists pgcrypto;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text,
  app_name text,
  destination_type text not null default 'direct',
  ios_url text,
  android_url text,
  fallback_url text,
  appsflyer_url text,
  appsflyer_pid text,
  campaign text not null,
  payout_amount numeric(10, 2),
  payout_currency text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.merchants add column if not exists app_name text;
alter table public.merchants add column if not exists destination_type text not null default 'direct';
alter table public.merchants add column if not exists ios_url text;
alter table public.merchants add column if not exists android_url text;
alter table public.merchants add column if not exists fallback_url text;
alter table public.merchants add column if not exists appsflyer_pid text;
alter table public.merchants add column if not exists payout_amount numeric(10, 2);
alter table public.merchants add column if not exists payout_currency text;
alter table public.merchants add column if not exists is_active boolean not null default true;
alter table public.merchants alter column appsflyer_url drop not null;

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  device_type text not null default 'unknown',
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists scan_events_merchant_id_idx on public.scan_events(merchant_id);
create index if not exists scan_events_created_at_idx on public.scan_events(created_at desc);

create table if not exists public.access_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists access_users_username_idx on public.access_users(lower(username));
create index if not exists access_users_created_at_idx on public.access_users(created_at desc);

insert into public.access_users (name, email, username, password_hash, is_admin)
values ('Admin', 'admin@euphoria.local', 'admin', extensions.crypt('654123', extensions.gen_salt('bf')), true)
on conflict (username) do nothing;

alter table public.merchants enable row level security;
alter table public.scan_events enable row level security;
alter table public.access_users enable row level security;

drop policy if exists "Public can read merchants" on public.merchants;
create policy "Public can read merchants"
on public.merchants for select
to anon
using (true);

drop policy if exists "Public can create merchants" on public.merchants;
create policy "Public can create merchants"
on public.merchants for insert
to anon
with check (true);

drop policy if exists "Public can update merchants" on public.merchants;
create policy "Public can update merchants"
on public.merchants for update
to anon
using (true)
with check (true);

drop policy if exists "Public can delete merchants" on public.merchants;
create policy "Public can delete merchants"
on public.merchants for delete
to anon
using (true);

drop policy if exists "Public can read scan events" on public.scan_events;
create policy "Public can read scan events"
on public.scan_events for select
to anon
using (true);

drop policy if exists "Public can log scan events" on public.scan_events;
create policy "Public can log scan events"
on public.scan_events for insert
to anon
with check (true);

drop policy if exists "No direct access user reads" on public.access_users;
create policy "No direct access user reads"
on public.access_users for select
to anon
using (false);

drop policy if exists "No direct access user writes" on public.access_users;
create policy "No direct access user writes"
on public.access_users for insert
to anon
with check (false);

create or replace function public.login_access_user(input_username text, input_password text)
returns table (
  id uuid,
  name text,
  email text,
  username text,
  is_admin boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select au.id, au.name, au.email, au.username, au.is_admin, au.created_at
  from public.access_users au
  where lower(au.username) = lower(trim(input_username))
    and au.password_hash = extensions.crypt(input_password, au.password_hash)
  limit 1;
$$;

create or replace function public.list_access_users()
returns table (
  id uuid,
  name text,
  email text,
  username text,
  is_admin boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select au.id, au.name, au.email, au.username, au.is_admin, au.created_at
  from public.access_users au
  order by au.created_at desc;
$$;

create or replace function public.create_access_user(
  input_name text,
  input_email text,
  input_username text,
  input_password text
)
returns table (
  id uuid,
  name text,
  email text,
  username text,
  is_admin boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  insert into public.access_users (name, email, username, password_hash, is_admin)
  values (
    trim(input_name),
    lower(trim(input_email)),
    trim(input_username),
    extensions.crypt(input_password, extensions.gen_salt('bf')),
    false
  )
  returning access_users.id, access_users.name, access_users.email, access_users.username, access_users.is_admin, access_users.created_at;
end;
$$;

grant execute on function public.login_access_user(text, text) to anon;
grant execute on function public.list_access_users() to anon;
grant execute on function public.create_access_user(text, text, text, text) to anon;
