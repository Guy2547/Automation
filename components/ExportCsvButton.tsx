"use client";

import { useTranslations } from "next-intl";
import { downloadCsv } from "@/lib/store";

export default function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: object[];
}) {
  const t = useTranslations("common");
  return (
    <button
      className="btn-ghost text-[12.5px] font-medium px-3 py-1.5 rounded-md"
      onClick={() => downloadCsv(filename, rows)}
      disabled={rows.length === 0}
    >
      {t("exportCsv")}
    </button>
  );
}
