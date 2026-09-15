# รายงานการใช้ AI ในการพัฒนา (สั้น)

โปรเจกต์นี้ใช้ AI ช่วยในทุกขั้นตอนตามที่โจทย์อนุญาต:

1. **วิเคราะห์ Requirement** — แตก PDF โจทย์เป็น checklist เกณฑ์คะแนน 100 + Bonus แล้ว map เป็น route/schema
2. **ออกแบบ Database** — ร่าง `schema.sql` (4 ตาราง + FK + UNIQUE + RLS ตาม role) และ `seed.sql` จากข้อมูลตัวอย่างใน UI
3. **เขียน Source Code** — port `dashboard_app.html` (ดีไซน์สำเร็จ) เป็น Next.js App Router: `globals.css`, `Sidebar/Topbar/StatusPill/Modal/Mascot`, 7 หน้า + ฟอร์ม + validation + filter + Export CSV
4. **UI/UX** — ยึด theme dark industrial เดิม 100% (gold/green/red pills, hero gauge, timeline, responsive @880px)
5. **SQL** — เขียน RLS policies (admin full-write, technician จำกัด) + helper `is_admin()`
6. **Debug** — ตรวจ `tsc --noEmit` + `npm run build` ให้ผ่านบน GitHub Actions และ Vercel
7. **Test** — smoke test ทุก role: login ผิด/ถูก, CRUD + unique validation, กันสิทธิ์ปุ่ม + route, export CSV
8. **Refactor** — รวม logic ไว้ `lib/store.ts` (Supabase เมื่อมี env, fallback localStorage demo mode) เพื่อให้ deploy ได้แม้ยังไม่ตั้ง Supabase

**เครื่องมือ:** AI coding assistant (Muse Spark ผ่าน OpenCode) + ผู้ตรวจทาน/ตัดสินใจโดยนักศึกษา
**ผลลัพธ์:** ระบบทำงานได้จริง ทดสอบได้ ส่งมอบได้ (GitHub + CI + Vercel) โดยไม่ต้องอธิบาย code ทีละบรรทัดตามข้อกำหนด
