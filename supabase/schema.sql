-- Alarm & Maintenance Management System — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor (in order).
-- Passwords are handled by Supabase Auth (bcrypt hash in auth.users);
-- this schema stores NO password column.

-- 1) profiles (role for Admin / Technician)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'technician' check (role in ('admin','technician')),
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- 2) machines
create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null unique,
  name text not null,
  type text not null default '',
  location text not null default '',
  status text not null default 'Running'
    check (status in ('Running','Stop','Alarm','Maintenance')),
  load_pct int not null default 0 check (load_pct >= 0 and load_pct <= 100),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) alarms
create table if not exists public.alarms (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  alarm_code text not null unique,
  description text not null default '',
  occurred_at timestamptz not null default now(),
  cause text not null default '',
  status text not null default 'Open'
    check (status in ('Open','In Progress','Closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists alarms_machine_idx on public.alarms(machine_id);
create index if not exists alarms_status_idx on public.alarms(status);

-- 4) maintenance_records
create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  maintenance_type text not null default 'Corrective'
    check (maintenance_type in ('Preventive','Corrective','Emergency')),
  problem text not null default '',
  action_taken text not null default '',
  technician text not null default '',
  date date not null default current_date,
  status text not null default 'Open'
    check (status in ('Open','In Progress','Closed','Waiting Part')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists maint_machine_idx on public.maintenance_records(machine_id);
create index if not exists maint_status_idx on public.maintenance_records(status);

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.alarms enable row level security;
alter table public.maintenance_records enable row level security;

-- helper: is admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: user reads own row, admin reads all; user can insert own row on signup
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update using (public.is_admin());

-- machines: authenticated read; admin full write
drop policy if exists "machines_read" on public.machines;
create policy "machines_read" on public.machines for select to authenticated using (true);
drop policy if exists "machines_write_admin" on public.machines;
create policy "machines_write_admin" on public.machines for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- alarms: authenticated read; admin full write; technician may update status only
drop policy if exists "alarms_read" on public.alarms;
create policy "alarms_read" on public.alarms for select to authenticated using (true);
drop policy if exists "alarms_insert" on public.alarms;
create policy "alarms_insert" on public.alarms for insert to authenticated with check (true);
drop policy if exists "alarms_update_admin" on public.alarms;
create policy "alarms_update_admin" on public.alarms for update to authenticated using (public.is_admin());
drop policy if exists "alarms_delete_admin" on public.alarms;
create policy "alarms_delete_admin" on public.alarms for delete to authenticated using (public.is_admin());

-- maintenance: authenticated read/insert; admin full write; technician update own scope
drop policy if exists "maint_read" on public.maintenance_records;
create policy "maint_read" on public.maintenance_records for select to authenticated using (true);
drop policy if exists "maint_insert" on public.maintenance_records;
create policy "maint_insert" on public.maintenance_records for insert to authenticated with check (true);
drop policy if exists "maint_update" on public.maintenance_records;
create policy "maint_update" on public.maintenance_records for update to authenticated using (true);
drop policy if exists "maint_delete_admin" on public.maintenance_records;
create policy "maint_delete_admin" on public.maintenance_records for delete to authenticated using (public.is_admin());
