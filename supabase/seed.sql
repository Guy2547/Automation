-- Seed demo data (run AFTER creating auth users + profiles).
-- Replace the UUIDs with the real user ids from Authentication > Users.
-- Demo logins: admin@test.com (admin), technician@test.com (technician).
-- Passwords are set in Dashboard > Authentication (stored hashed, never here).

-- profiles (upsert role for the two demo users)
-- insert into public.profiles (id, email, role, display_name) values
--   ('<ADMIN_UUID>', 'admin@test.com', 'admin', 'Kaito T.'),
--   ('<TECH_UUID>', 'technician@test.com', 'technician', 'Anan P.')
-- on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;

-- machines
insert into public.machines (machine_id, name, type, location, status, load_pct) values
  ('MC-0002', 'Injection Molder 02', 'Injection', 'Line B', 'Running', 78),
  ('MC-0005', 'Conveyor Belt 05', 'Conveyor', 'Line A', 'Alarm', 12),
  ('MC-0011', 'CNC Router 11', 'CNC', 'Line C', 'Maintenance', 40),
  ('MC-0007', 'Packing Unit 07', 'Packing', 'Line B', 'Stop', 0),
  ('MC-0003', 'Welding Arm 03', 'Welding', 'Line A', 'Running', 91)
on conflict (machine_id) do nothing;

-- alarms (needs machine uuids)
-- insert into public.alarms (machine_id, alarm_code, description, occurred_at, cause, status)
-- select m.id, v.code, v.description, v.occurred_at::timestamptz, v.cause, v.status
-- from (values
--   ('MC-0005','AL-1042','Motor overload','2026-09-15 09:41+07','Overcurrent trip','Open'),
--   ('MC-0011','AL-1039','Sensor fault','2026-09-15 08:15+07','Proximity sensor misaligned','In Progress'),
--   ('MC-0007','AL-1040','Jam detected','2026-09-15 07:52+07','Material misfeed','Open'),
--   ('MC-0007','AL-1031','E-stop triggered','2026-09-14 16:02+07','Operator initiated','Closed')
-- ) as v(mid, code, description, occurred_at, cause, status)
-- join public.machines m on m.machine_id = v.mid
-- on conflict (alarm_code) do nothing;

-- maintenance_records
-- insert into public.maintenance_records (machine_id, maintenance_type, problem, action_taken, technician, date, status)
-- select m.id, v.mtype, v.problem, v.action, v.tech, v.date::date, v.status
-- from (values
--   ('MC-0005','Corrective','Motor bearing worn out','Bearing on order','Anan P.','2026-09-15','Waiting Part'),
--   ('MC-0011','Preventive','Quarterly sensor calibration','Recalibrated, tested','Suda K.','2026-09-14','Closed'),
--   ('MC-0007','Corrective','E-stop circuit reset','Reset breaker, verified','Anan P.','2026-09-13','Closed')
-- ) as v(mid, mtype, problem, action, tech, date, status)
-- join public.machines m on m.machine_id = v.mid;
