# Alarm & Maintenance Management System

Web Application สนับสนุนงาน Automation / โรงงาน — จัดการเครื่องจักร, Alarm และงาน Maintenance
(วิชา Programming in Automation Systems — อนุญาตให้ใช้ AI ช่วยพัฒนาได้ทุกขั้นตอน)

**Tech:** Next.js 16 (App Router) · Tailwind CSS 4 · Supabase (Auth + Postgres + RLS) · GitHub Actions · Vercel · AI-assisted

## Function หลัก

| หน้า | ความสามารถ |
|---|---|
| `/login` | Supabase Authentication (email/password, hash ด้วย bcrypt ฝั่ง Supabase Auth), 2 Role: Admin / Technician |
| `/dashboard` | จำนวนเครื่องทั้งหมด, Running / Stop / Alarm / Maintenance, จำนวน Alarm + Maintenance, gauge uptime, timeline, ตารางล่าสุด |
| `/machines` | CRUD Machine Master (Machine ID unique, Name, Type, Location, Status) + Search + Filter Status/Location — Admin เท่านั้นที่ Add/Edit/Delete |
| `/machines/[id]` | Machine History (Bonus) — Alarm + Maintenance ของเครื่องนั้น |
| `/alarms` | CRUD Alarm (Machine, Alarm Code unique, Description, Date/Time, Cause, Status Open/In Progress/Closed) + Filter code/status + date-range (Bonus) — Technician เปลี่ยน status ได้, ลบไม่ได้ |
| `/maintenance` | CRUD Maintenance (Machine, Type, Problem, Action Taken, Technician, Date, Status +Waiting Part) + Filter machine/status/technician — Technician สร้าง/แก้ไขได้, ลบไม่ได้ |
| `/reports` | กราฟ Alarm by machine + %งานเสร็จ (Bonus) |
| Export CSV | ทุกตารางหลัก (Bonus) |
| UI | Dark industrial theme (port จาก `dashboard_app.html`), Responsive, mascot Line Buddy |

## Database Structure (Supabase)

`profiles(id→auth.users, email, role[admin|technician], display_name)` · `machines(id, machine_id UNIQUE, name, type, location, status[Running|Stop|Alarm|Maintenance])` · `alarms(id, machine_id→machines, alarm_code UNIQUE, description, occurred_at, cause, status[Open|In Progress|Closed])` · `maintenance_records(id, machine_id→machines, maintenance_type[Preventive|Corrective|Emergency], problem, action_taken, technician, date, status[Open|In Progress|Closed|Waiting Part])` — RLS: อ่านได้หลัง login, เขียนตาม role (ดู `supabase/schema.sql`)

รหัสผ่านไม่ถูกเก็บในตารางใดๆ — Supabase Auth เก็บเฉพาะ bcrypt hash ใน `auth.users`

## วิธีติดตั้ง / ใช้งาน

```bash
npm install
cp .env.example .env.local   # ใส่ NEXT_PUBLIC_SUPABASE_URL + ANON_KEY จริง
npm run dev                   # http://localhost:3000
```

1. Supabase Dashboard → SQL Editor → รัน `supabase/schema.sql`
2. Authentication → Users → สร้าง `admin@test.com` / `technician@test.com` (ตั้งรหัสที่นั่น)
3. รัน `supabase/seed.sql` (แก้ UUID ให้ตรง user จริง) หรือกรอกผ่าน UI ได้เลย
4. ไม่มี env? ระบบเข้า **demo mode** (localStorage + seed ใน `lib/mock.ts`) ใช้ `admin@test.com/admin123`, `technician@test.com/tech1234` ทดสอบ role ได้ทันที

## Vercel URL

_(หลัง deploy — Vercel → Import `Guy2547/Automation` → ใส่ env 2 ตัว → Deploy)_

## ผู้จัดทำ

1. นายอมรินทร์ ขวัญคีรี — รหัสนักศึกษา 056860405008-4
2. นายณัฐพล ล่องทอง — รหัสนักศึกษา 056860405067-0
3. นายอินทัช เวนานนท์ — รหัสนักศึกษา 056960405159-3

## การใช้ AI ในการพัฒนา

ดู `AI_USAGE.md`
