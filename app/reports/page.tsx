"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import { listAlarms, listMaintenance } from "@/lib/store";

export default function ReportsPage() {
  const t = useTranslations("reports");
  const [alarms, setAlarms] = useState(() => {
    try { return listAlarms(); } catch { return []; }
  });
  const [maint, setMaint] = useState(() => {
    try { return listMaintenance(); } catch { return []; }
  });
  useEffect(() => {
    try {
      setAlarms(listAlarms());
      setMaint(listMaintenance());
    } catch { /* ignore */ }
  }, []);

  const openN = alarms.filter((a) => a.status === "Open").length;
  const closedN = alarms.filter((a) => a.status === "Closed").length;
  const donePct = maint.length === 0 ? 0 : Math.round((maint.filter((row) => row.status === "Closed").length / maint.length) * 100);

  const byMachine = new Map<string, number>();
  alarms.forEach((a) => byMachine.set(a.machine_name, (byMachine.get(a.machine_name) ?? 0) + 1));
  const bars = [...byMachine.entries()].slice(0, 5);
  const max = Math.max(1, ...bars.map(([, n]) => n));

  return (
    <AppShell crumb="Reports">
      <div className="mb-5">
        <div className="text-[19px] font-bold">{t("title")}</div>
        <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{t("subtitle")}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("alarmsWeek")}</div><div className="text-[26px] font-bold" style={{ color: "var(--alarm)" }}>{alarms.length}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("openAlarms")}</div><div className="text-[26px] font-bold" style={{ color: "var(--gold-soft)" }}>{openN}<span className="text-[14px] font-medium" style={{ color: "var(--ink-faint)" }}>{t("closedSuffix", { n: closedN })}</span></div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("maintDone")}</div><div className="text-[26px] font-bold" style={{ color: "var(--ok)" }}>{donePct}%</div></div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[14.5px]">{t("byMachine")}</h2>
          <ExportCsvButton filename="alarm-report.csv" rows={alarms} />
        </div>
        <div className="flex items-end gap-5" style={{ height: 150 }}>
          {bars.map(([name, n], i) => (
            <div key={name} className="flex flex-col items-center gap-2 flex-1 justify-end" style={{ height: "100%" }}>
              <div style={{ width: 34, height: `${Math.max(8, (n / max) * 100)}%`, borderRadius: "6px 6px 0 0", background: i === 2 ? "linear-gradient(180deg,#F2938C,var(--alarm))" : "linear-gradient(180deg,var(--gold-soft),var(--maint))" }} title={`${n}`} />
              <div className="text-[11px] mono" style={{ color: "var(--ink-faint)" }}>{name.slice(0, 12)} ({n})</div>
            </div>
          ))}
          {bars.length === 0 && <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{t("noData")}</div>}
        </div>
      </div>
    </AppShell>
  );
}
