"use client";

export default function Topbar({
  crumb,
  query,
  onQuery,
}: {
  crumb: string;
  query?: string;
  onQuery?: (v: string) => void;
}) {
  return (
    <div className="topbar flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "var(--line)", background: "rgba(7,13,10,0.5)" }}>
      <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--ink-faint)" }}>
        <span>Automation</span><span>/</span><span style={{ color: "var(--ink)" }}>{crumb}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          placeholder="Search machine, alarm code..."
          className="text-[12.5px] px-3.5 py-2 rounded-lg w-64"
          value={query ?? ""}
          onChange={(e) => onQuery?.(e.target.value)}
        />
        <button className="w-9 h-9 rounded-lg flex items-center justify-center relative btn-ghost" title="Notifications">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: "var(--alarm)" }} />
        </button>
      </div>
    </div>
  );
}
