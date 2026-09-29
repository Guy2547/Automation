# Alarm & Maintenance Management System

Web Application สนับสนุนงาน Automation / โรงงาน — จัดการเครื่องจักร, Alarm และงาน Maintenance
(วิชา Programming in Automation Systems — อนุญาตให้ใช้ AI ช่วยพัฒนาได้ทุกขั้นตอน)

**Tech:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Auth + Postgres + RLS) · next-intl (TH/EN) · Vercel

## Function หลัก

| หน้า                | ความสามารถ                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/login`            | Supabase Authentication (email/password, hash ด้วย bcrypt ฝั่ง Supabase Auth), Roles: Admin / Technician / Viewer + สร้าง custom role ได้ |
| `/dashboard`        | จำนวนเครื่องทั้งหมด, Running / Stop / Alarm / Maintenance, จำนวน Alarm + Maintenance, gauge uptime, timeline, ตารางล่าสุด |
| `/machines`         | CRUD Machine Master (Machine ID unique, Name, Type, Location, Status) + Search + Filter Status/Location — ต้องมีสิทธิ์ `machines.manage` ถึง Add/Edit/Delete ได้ |
| `/machines/[id]`    | Machine History — Alarm + Maintenance ของเครื่องนั้น                                                              |
| `/alarms`           | CRUD Alarm (Machine, Alarm Code unique, Description, Date/Time, Cause, Status Open/In Progress/Closed) + Filter code/status + date-range — สิทธิ์ `alarms.status` เปลี่ยนสถานะได้, `alarms.delete` ถึงลบได้ |
| `/maintenance`      | CRUD Maintenance (Machine, Type, Problem, Action Taken, Technician, Date, Status +Waiting Part) + Filter machine/status/technician — ต้องมีสิทธิ์ `maintenance.edit` ถึงสร้าง/แก้ไขได้ |
| `/reports`          | กราฟ Alarm by machine + %งานเสร็จ                                                                                 |
| `/admin/users`      | ตาราง users + เปลี่ยน role (ต้องมีสิทธิ์ `users.manage`, ห้ามเปลี่ยน role ตัวเอง) + เพิ่ม/ลบ user ผ่าน API (ต้องตั้ง `SUPABASE_SERVICE_ROLE_KEY`) |
| `/admin/roles`      | สร้าง/แก้/ลบ custom roles + เมทริกซ์ permissions (built-in ลบไม่ได้)                                              |
| `/admin/activity`   | Audit log: ใครเข้าระบบ จาก IP/เบราว์เซอร์ไหน + การกระทำของทุก user (ต้องมีสิทธิ์ `users.manage`)                  |
| Export CSV          | ทุกตารางหลัก (ต้องมีสิทธิ์ `export`)                                                                              |
| UI                  | Dark industrial theme, Responsive, สลับภาษา TH/EN, mascot Line Buddy                                              |

## 2 โหมดการทำงาน

| โหมด      | เงื่อนไข | เก็บข้อมูลที่ |
| --------- | -------- | ------------- |
| **Demo**  | ไม่มี env จริง (หรือยังเป็น placeholder `your-project`) | `localStorage` ในเบราว์เซอร์ — login ด้วยอีเมลอะไรก็ได้ (รหัส ≥6 ตัวอักษร), role ดูจาก prefix (`admin*` → admin) |
| **Supabase** | ตั้ง `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` จริง | Supabase Auth + Postgres (บังคับ RLS ตาม role) |

Demo accounts (ใช้ได้ทันทีใน demo mode): `admin@test.com / admin1234` (แอดมิน) · `technician@test.com / technician1234` (ช่างเทคนิค)

## วิธีติดตั้ง / ใช้งาน

```bash
npm install
cp .env.example .env.local   # ใส่ค่าจริง แล้ว restart dev server
npm run dev                   # http://localhost:3000
```

## ต่อ Supabase (ทำให้เป็นระบบจริง)

1. Supabase Dashboard → SQL Editor → รันตามลำดับ:
   `supabase/schema.sql` → `supabase/migration_roles.sql` → `supabase/migration_activity.sql`
2. Authentication → Users → Add user (ติ๊ก Auto Confirm email):
   `admin@test.com / admin1234`, `technician@test.com / technician1234` → copy **UUID** ของทั้ง 2 คน
3. ลงทะเบียน profile ด้วย UUID จริง (ห้าม random เอง):
   ```sql
   insert into public.profiles (id, email, role, display_name) values
     ('<ADMIN_UUID>', 'admin@test.com', 'admin', 'Kaito T.'),
     ('<TECH_UUID>', 'technician@test.com', 'technician', 'Anan P.')
   on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;
   ```
4. ใส่ env ใน `.env.local` (local) และ Vercel → Settings → Environment Variables (production) แล้ว redeploy

รหัสผ่านไม่ถูกเก็บในตารางใดๆ — Supabase Auth เก็บเฉพาะ bcrypt hash ใน `auth.users`

## Environment Variables

| ตัวแปร | ที่ใช้ | หมายเหตุ |
| ------ | ----- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | เช่น `https://xxx.supabase.co` (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | `anon public` key — ใช้คู่กับ RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server เท่านั้น (ไม่มี `NEXT_PUBLIC_`) | ใช้ใน `/api/admin/users` + `/api/activity` — ห้ามโชว์ฝั่ง client |

## Scripts

```bash
npm run dev    # รัน dev server
npm run build  # build production (tsc + Next build)
npm run start  # รัน production build
npm run lint   # eslint
```

## โครงโปรเจกต์

```
app/                  # Routes (dashboard, machines, alarms, maintenance, reports, login, admin/*, api/*)
components/           # AppShell, Sidebar, Topbar, StatusPill, Modal, Mascot, ExportCsvButton, ...
lib/                  # store.ts (auth+CRUD, Supabase/demo fallback), activity.ts, types.ts, mock.ts, errorMap.ts
lib/supabase/         # client.ts (isSupabaseConfigured กัน placeholder), server.ts
messages/             # th.json, en.json (next-intl)
supabase/             # schema.sql, migration_roles.sql, migration_activity.sql, seed.sql
middleware.ts         # เบาๆ — auth หลักอยู่ฝั่ง client (AppShell) + RLS ฝั่ง DB
```

## Database (Supabase)

`profiles(id→auth.users, email, role→roles.name, display_name)` · `roles(name PK, display_name, permissions jsonb, is_builtin)` · `machines(id, machine_id UNIQUE, name, type, location, status[Running|Stop|Alarm|Maintenance])` · `alarms(id, machine_id→machines, alarm_code UNIQUE, description, occurred_at, cause, status[Open|In Progress|Closed])` · `maintenance_records(id, machine_id→machines, maintenance_type[Preventive|Corrective|Emergency], problem, action_taken, technician, date, status[Open|In Progress|Closed|Waiting Part])` · `activity_log(append-only, อ่านได้เฉพาะ admin)` — ดู `supabase/*.sql`

## ผู้จัดทำ

1. นายอมรินทร์ ขวัญคีรี — รหัสนักศึกษา 056860405008-4
2. นายณัฐพล ล่องทอง — รหัสนักศึกษา 056860405067-0
3. นายอินทัช เวนานนท์ — รหัสนักศึกษา 056960405159-3
