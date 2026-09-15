"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/Modal";
import { login } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = await login(email, password);
      router.push(s.role === "admin" ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="modal-box" style={{ width: 400 }}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="brand-mark">A</div>
          <div className="leading-tight">
            <div className="text-white font-bold text-[14px]">Alarm &amp; Maintenance</div>
            <div className="text-[10.5px] mono" style={{ color: "var(--ink-faint)" }}>MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <h1 className="font-bold text-[18px] mb-1">Login</h1>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
          Supabase Authentication — รหัสผ่านถูกเก็บแบบ hash (bcrypt) ฝั่ง Supabase Auth เท่านั้น
        </p>
        <form onSubmit={submit}>
          <FormError message={error} />
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@test.com" autoComplete="email" />
          </div>
          <div className="field">
            <label>Password (อย่างน้อย 6 ตัวอักษร)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          </div>
          <button className="btn-primary text-[13px] px-3 py-2.5 rounded-lg w-full mt-2" disabled={busy}>
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="text-[11.5px] mt-4 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          Demo: <span className="mono">admin@test.com / admin123</span> (Admin) · <span className="mono">technician@test.com / tech1234</span> (Technician)
        </div>
        <div className="text-[11px] mt-3 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          ผู้จัดทำ: อมรินทร์ ขวัญคีรี 056860405008-4 · ณัฐพล ล่องทอง 056860405067-0 · อินทัช เวนานนท์ 056960405159-3
        </div>
      </div>
    </div>
  );
}
