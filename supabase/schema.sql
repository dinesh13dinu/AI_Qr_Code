create extension if not exists pgcrypto;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text,
  appsflyer_url text not null,
  campaign text not null,
  notes text,
  created_at timestamptz not null default now()
);

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

alter table public.merchants enable row level security;
alter table public.scan_events enable row level security;

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
