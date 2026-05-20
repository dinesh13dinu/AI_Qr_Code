create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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

create table if not exists public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.access_users(id) on delete cascade,
  session_token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default now() + interval '8 hours',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists access_sessions_token_idx on public.access_sessions(session_token);
create index if not exists access_sessions_user_id_idx on public.access_sessions(user_id);
create index if not exists access_sessions_expires_at_idx on public.access_sessions(expires_at desc);

alter table public.merchants enable row level security;
alter table public.scan_events enable row level security;
alter table public.access_users enable row level security;
alter table public.access_sessions enable row level security;

drop policy if exists "Public can read merchants" on public.merchants;
drop policy if exists "No direct merchant reads" on public.merchants;
create policy "No direct merchant reads"
on public.merchants for select
to anon
using (false);

drop policy if exists "Public can create merchants" on public.merchants;
drop policy if exists "No direct merchant creates" on public.merchants;
create policy "No direct merchant creates"
on public.merchants for insert
to anon
with check (false);

drop policy if exists "Public can update merchants" on public.merchants;
drop policy if exists "No direct merchant updates" on public.merchants;
create policy "No direct merchant updates"
on public.merchants for update
to anon
using (false)
with check (false);

drop policy if exists "Public can delete merchants" on public.merchants;
drop policy if exists "No direct merchant deletes" on public.merchants;
create policy "No direct merchant deletes"
on public.merchants for delete
to anon
using (false);

drop policy if exists "Public can read scan events" on public.scan_events;
drop policy if exists "No direct scan reads" on public.scan_events;
create policy "No direct scan reads"
on public.scan_events for select
to anon
using (false);

drop policy if exists "Public can log scan events" on public.scan_events;
drop policy if exists "No direct scan writes" on public.scan_events;
create policy "No direct scan writes"
on public.scan_events for insert
to anon
with check (false);

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

drop policy if exists "No direct session reads" on public.access_sessions;
create policy "No direct session reads"
on public.access_sessions for select
to anon
using (false);

drop policy if exists "No direct session writes" on public.access_sessions;
create policy "No direct session writes"
on public.access_sessions for insert
to anon
with check (false);

drop function if exists public.list_access_users();
drop function if exists public.create_access_user(text, text, text, text);

create or replace function public.require_access_user(input_session_token text, input_admin boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found_user_id uuid;
  found_is_admin boolean;
begin
  select au.id, au.is_admin
    into found_user_id, found_is_admin
  from public.access_sessions sessions
  join public.access_users au on au.id = sessions.user_id
  where sessions.session_token::text = trim(input_session_token)
    and sessions.revoked_at is null
    and sessions.expires_at > now()
  limit 1;

  if found_user_id is null then
    raise exception 'Invalid or expired session.' using errcode = '28000';
  end if;

  if input_admin and not found_is_admin then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  return found_user_id;
end;
$$;

create or replace function public.login_access_user(input_username text, input_password text)
returns table (
  id uuid,
  name text,
  email text,
  username text,
  is_admin boolean,
  created_at timestamptz,
  session_token text,
  session_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found_user public.access_users%rowtype;
  new_session public.access_sessions%rowtype;
begin
  select *
    into found_user
  from public.access_users au
  where lower(au.username) = lower(trim(input_username))
    and au.password_hash = extensions.crypt(input_password, au.password_hash)
  limit 1;

  if found_user.id is null then
    return;
  end if;

  update public.access_sessions
    set revoked_at = now()
  where user_id = found_user.id
    and revoked_at is null
    and expires_at <= now();

  insert into public.access_sessions (user_id)
  values (found_user.id)
  returning * into new_session;

  return query
  select
    found_user.id,
    found_user.name,
    found_user.email,
    found_user.username,
    found_user.is_admin,
    found_user.created_at,
    new_session.session_token::text,
    new_session.expires_at;
end;
$$;

create or replace function public.logout_access_user(input_session_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_access_user(input_session_token, false);

  update public.access_sessions
    set revoked_at = now()
  where session_token::text = trim(input_session_token)
    and revoked_at is null;
end;
$$;

create or replace function public.list_access_users(input_session_token text)
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
  select public.require_access_user(input_session_token, true);

  select au.id, au.name, au.email, au.username, au.is_admin, au.created_at
  from public.access_users au
  order by au.created_at desc;
$$;

create or replace function public.create_access_user(
  input_session_token text,
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
  perform public.require_access_user(input_session_token, true);

  if length(trim(input_password)) < 8 then
    raise exception 'Password must be at least 8 characters.' using errcode = '22023';
  end if;

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

create or replace function public.list_admin_merchants(input_session_token text)
returns table (
  id uuid,
  name text,
  slug text,
  location text,
  app_name text,
  destination_type text,
  ios_url text,
  android_url text,
  fallback_url text,
  appsflyer_url text,
  appsflyer_pid text,
  campaign text,
  payout_amount numeric,
  payout_currency text,
  is_active boolean,
  notes text,
  created_at timestamptz,
  scans bigint,
  last_scan_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select public.require_access_user(input_session_token, false);

  select
    merchants.id,
    merchants.name,
    merchants.slug,
    merchants.location,
    merchants.app_name,
    merchants.destination_type,
    merchants.ios_url,
    merchants.android_url,
    merchants.fallback_url,
    merchants.appsflyer_url,
    merchants.appsflyer_pid,
    merchants.campaign,
    merchants.payout_amount,
    merchants.payout_currency,
    merchants.is_active,
    merchants.notes,
    merchants.created_at,
    coalesce(scan_stats.scans, 0)::bigint as scans,
    scan_stats.last_scan_at
  from public.merchants
  left join lateral (
    select count(*)::bigint as scans, max(created_at) as last_scan_at
    from public.scan_events
    where scan_events.merchant_id = merchants.id
  ) scan_stats on true
  order by merchants.created_at desc;
$$;

create or replace function public.create_admin_merchant(
  input_session_token text,
  input_name text,
  input_slug text,
  input_location text,
  input_app_name text,
  input_destination_type text,
  input_ios_url text,
  input_android_url text,
  input_fallback_url text,
  input_appsflyer_url text,
  input_appsflyer_pid text,
  input_campaign text,
  input_payout_amount numeric,
  input_payout_currency text,
  input_is_active boolean,
  input_notes text
)
returns setof public.merchants
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_access_user(input_session_token, false);

  return query
  insert into public.merchants (
    name, slug, location, app_name, destination_type, ios_url, android_url, fallback_url,
    appsflyer_url, appsflyer_pid, campaign, payout_amount, payout_currency, is_active, notes
  )
  values (
    trim(input_name), trim(input_slug), nullif(trim(input_location), ''), nullif(trim(input_app_name), ''),
    input_destination_type, nullif(trim(input_ios_url), ''), nullif(trim(input_android_url), ''),
    nullif(trim(input_fallback_url), ''), nullif(trim(input_appsflyer_url), ''), nullif(trim(input_appsflyer_pid), ''),
    trim(input_campaign), input_payout_amount, input_payout_currency, input_is_active, nullif(trim(input_notes), '')
  )
  returning *;
end;
$$;

create or replace function public.update_admin_merchant(
  input_session_token text,
  input_id uuid,
  input_name text,
  input_slug text,
  input_location text,
  input_app_name text,
  input_destination_type text,
  input_ios_url text,
  input_android_url text,
  input_fallback_url text,
  input_appsflyer_url text,
  input_appsflyer_pid text,
  input_campaign text,
  input_payout_amount numeric,
  input_payout_currency text,
  input_is_active boolean,
  input_notes text
)
returns setof public.merchants
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_access_user(input_session_token, false);

  return query
  update public.merchants
    set
      name = trim(input_name),
      slug = trim(input_slug),
      location = nullif(trim(input_location), ''),
      app_name = nullif(trim(input_app_name), ''),
      destination_type = input_destination_type,
      ios_url = nullif(trim(input_ios_url), ''),
      android_url = nullif(trim(input_android_url), ''),
      fallback_url = nullif(trim(input_fallback_url), ''),
      appsflyer_url = nullif(trim(input_appsflyer_url), ''),
      appsflyer_pid = nullif(trim(input_appsflyer_pid), ''),
      campaign = trim(input_campaign),
      payout_amount = input_payout_amount,
      payout_currency = input_payout_currency,
      is_active = input_is_active,
      notes = nullif(trim(input_notes), '')
  where merchants.id = input_id
  returning *;
end;
$$;

create or replace function public.delete_admin_merchant(input_session_token text, input_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_access_user(input_session_token, false);

  delete from public.merchants
  where id = input_id;
end;
$$;

create or replace function public.get_public_merchant_by_slug(input_slug text)
returns setof public.merchants
language sql
security definer
set search_path = public, extensions
as $$
  select *
  from public.merchants
  where slug = trim(input_slug)
    and is_active = true
  limit 1;
$$;

create or replace function public.log_public_scan(
  input_merchant_id uuid,
  input_device_type text,
  input_user_agent text,
  input_referrer text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1
    from public.merchants
    where id = input_merchant_id
      and is_active = true
  ) then
    return;
  end if;

  insert into public.scan_events (merchant_id, device_type, user_agent, referrer)
  values (
    input_merchant_id,
    coalesce(nullif(trim(input_device_type), ''), 'unknown'),
    left(input_user_agent, 500),
    left(input_referrer, 500)
  );
end;
$$;

grant execute on function public.login_access_user(text, text) to anon;
grant execute on function public.logout_access_user(text) to anon;
grant execute on function public.list_access_users(text) to anon;
grant execute on function public.create_access_user(text, text, text, text, text) to anon;
grant execute on function public.list_admin_merchants(text) to anon;
grant execute on function public.create_admin_merchant(text, text, text, text, text, text, text, text, text, text, text, text, numeric, text, boolean, text) to anon;
grant execute on function public.update_admin_merchant(text, uuid, text, text, text, text, text, text, text, text, text, text, text, numeric, text, boolean, text) to anon;
grant execute on function public.delete_admin_merchant(text, uuid) to anon;
grant execute on function public.get_public_merchant_by_slug(text) to anon;
grant execute on function public.log_public_scan(uuid, text, text, text) to anon;
