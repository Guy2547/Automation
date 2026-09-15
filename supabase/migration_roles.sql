-- Alarm & Maintenance Management System — roles migration
-- Run AFTER supabase/schema.sql in SQL Editor.
-- Adds creatable custom roles + DB-level read-only viewer.

-- 1) roles table
create table if not exists public.roles (
  name text primary key,
  display_name text not null default '',
  permissions jsonb not null default '{}',
  is_builtin boolean not null default false,
  created_at timestamptz not null default now()
);

-- permission keys:
-- machines.manage, alarms.status, alarms.delete,
-- maintenance.edit, maintenance.delete,
-- users.manage, roles.manage, export

insert into public.roles (name, display_name, permissions, is_builtin) values
  ('admin', 'Administrator',
   '{"machines.manage": true, "alarms.status": true, "alarms.delete": true, "maintenance.edit": true, "maintenance.delete": true, "users.manage": true, "roles.manage": true, "export": true}',
   true),
  ('technician', 'Technician',
   '{"machines.manage": false, "alarms.status": true, "alarms.delete": false, "maintenance.edit": true, "maintenance.delete": false, "users.manage": false, "roles.manage": false, "export": true}',
   true),
  ('viewer', 'Viewer (read-only)',
   '{"machines.manage": false, "alarms.status": false, "alarms.delete": false, "maintenance.edit": false, "maintenance.delete": false, "users.manage": false, "roles.manage": false, "export": true}',
   true)
on conflict (name) do update
  set display_name = excluded.display_name,
      permissions = excluded.permissions;

-- 2) profiles.role -> FK to roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_fk;
alter table public.profiles
  add constraint profiles_role_fk foreign key (role) references public.roles(name);

-- 3) roles RLS: everyone reads, only admin writes
alter table public.roles enable row level security;
drop policy if exists "roles_read" on public.roles;
create policy "roles_read" on public.roles for select to authenticated using (true);
drop policy if exists "roles_write_admin" on public.roles;
create policy "roles_write_admin" on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) viewer read-only at DB level (admin policies already exclude non-admin)
create or replace function public.current_role()
returns text language sql security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- alarms insert: block viewer
drop policy if exists "alarms_insert" on public.alarms;
create policy "alarms_insert" on public.alarms for insert to authenticated
  with check (public.current_role() <> 'viewer');
-- maintenance insert/update: block viewer
drop policy if exists "maint_insert" on public.maintenance_records;
create policy "maint_insert" on public.maintenance_records for insert to authenticated
  with check (public.current_role() <> 'viewer');
drop policy if exists "maint_update" on public.maintenance_records;
create policy "maint_update" on public.maintenance_records for update to authenticated
  using (public.current_role() <> 'viewer');
-- alarms status change by non-admin is app-level; keep admin-only DB update
-- machines write stays admin-only (viewer already blocked)
