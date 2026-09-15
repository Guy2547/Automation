"use client";

const styles: Record<string, { bg: string; fg: string }> = {
  Running: { bg: "var(--ok-bg)", fg: "var(--ok)" },
  Stop: { bg: "var(--stop-bg)", fg: "var(--stop)" },
  Stopped: { bg: "var(--stop-bg)", fg: "var(--stop)" },
  Alarm: { bg: "var(--alarm-bg)", fg: "var(--alarm)" },
  Maintenance: { bg: "var(--maint-bg)", fg: "var(--maint)" },
  Open: { bg: "var(--alarm-bg)", fg: "var(--alarm)" },
  "In Progress": { bg: "var(--maint-bg)", fg: "var(--maint)" },
  Closed: { bg: "var(--stop-bg)", fg: "var(--stop)" },
  Completed: { bg: "var(--ok-bg)", fg: "var(--ok)" },
  Pending: { bg: "var(--maint-bg)", fg: "var(--maint)" },
  "Waiting Part": { bg: "var(--maint-bg)", fg: "var(--maint)" },
  Preventive: { bg: "var(--ok-bg)", fg: "var(--ok)" },
  Corrective: { bg: "var(--maint-bg)", fg: "var(--maint)" },
  Emergency: { bg: "var(--alarm-bg)", fg: "var(--alarm)" },
};

export default function StatusPill({ status }: { status: string }) {
  const s = styles[status] ?? { bg: "var(--stop-bg)", fg: "var(--stop)" };
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg, width: "fit-content" }}>
      <span className="dot" style={{ background: s.fg, color: s.fg }} />
      {status}
    </span>
  );
}
