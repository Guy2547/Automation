-- Alarm & Maintenance Management System — activity/audit log migration
-- Run AFTER supabase/schema.sql + supabase/migration_roles.sql in SQL Editor.
-- Storage is Supabase-only by design (demo mode skips logging client-side).

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null default '',
  role text not null default '',
  action text not null default '',
  detail text not null default '',
  ip text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists activity_created_idx on public.activity_log(created_at desc);
create index if not exists activity_email_idx on public.activity_log(email);
create index if not exists activity_action_idx on public.activity_log(action);

alter table public.activity_log enable row level security;

-- any signed-in user may append their own events (server route writes with RLS context)
drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert" on public.activity_log for insert to authenticated
  with check (true);

-- only admins may read the log (reuses existing helper from schema.sql)
drop policy if exists "activity_read_admin" on public.activity_log;
create policy "activity_read_admin" on public.activity_log for select to authenticated
  using (public.is_admin());

-- no update / delete policies: log rows are append-only
