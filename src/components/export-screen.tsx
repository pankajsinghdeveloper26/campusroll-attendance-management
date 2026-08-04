import type React from "react"
import { useState } from "react"
import { FileDown, FileSpreadsheet, FileText, Check, Download, Sheet } from "lucide-react"
import { ScreenShell } from "@/components/screen-shell"
import { useRoster, countNamed } from "@/lib/roster"
import { useAttendanceHistory } from "@/lib/attendance-history"
import { buildHistoryCsv, exportHistoryCsv, exportHistoryPdf, exportHistoryXlsx } from "@/lib/export-reports"
import { AppFooterTag } from "@/components/app-footer-tag"

type Format = "csv" | "xlsx" | "pdf"

export function ExportScreen({ onBack }: { onBack: () => void }) {
  const roster = useRoster()
  const history = useAttendanceHistory()
  const [format, setFormat] = useState<Format>("pdf")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState<Format | "all" | null>(null)

  const named = countNamed(roster)
  const totalMarks = history.reduce((n, s) => n + s.records.length, 0)

  async function runExport(fmt: Format) {
    setBusy(fmt)
    try {
      if (fmt === "csv") await exportHistoryCsv(history)
      else if (fmt === "xlsx") await exportHistoryXlsx(history)
      else await exportHistoryPdf(history)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } finally {
      setBusy(null)
    }
  }

  async function runAll() {
    setBusy("all")
    try {
      // Sequential: the native share sheet can only handle one file hand-off at a time.
      await exportHistoryPdf(history)
      await exportHistoryXlsx(history)
      await exportHistoryCsv(history)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } finally {
      setBusy(null)
    }
  }

  const preview =
    history.length === 0
      ? "No finalized sessions yet — start a live session\nand tap Finalize & Lock to build your log."
      : buildHistoryCsv(history).split("\n").slice(0, 8).join("\n")

  return (
    <ScreenShell title="Export Sheet" subtitle="Download attendance records" onBack={onBack}>
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_10px_25px_-16px_rgba(15,23,42,0.4)] ring-1 ring-slate-100">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FileDown className="h-7 w-7" />
        </span>
        <div>
          <p className="text-[16px] font-bold text-slate-900">BCA Data Science — Section A</p>
          <p className="text-sm text-slate-400">
            {roster.length} students · {named} named · {history.length} sessions
          </p>
        </div>
      </div>

      {/* Format picker */}
      <h2 className="mt-6 text-[15px] font-bold text-slate-700">Choose format</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <FormatCard
          active={format === "csv"}
          onClick={() => setFormat("csv")}
          icon={<FileSpreadsheet className="h-6 w-6" />}
          title="CSV"
          desc="Excel / Sheets"
        />
        <FormatCard
          active={format === "xlsx"}
          onClick={() => setFormat("xlsx")}
          icon={<Sheet className="h-6 w-6" />}
          title="Excel"
          desc=".xlsx workbook"
        />
        <FormatCard
          active={format === "pdf"}
          onClick={() => setFormat("pdf")}
          icon={<FileText className="h-6 w-6" />}
          title="PDF"
          desc="Printable report"
        />
      </div>

      {/* Preview */}
      <h2 className="mt-6 text-[15px] font-bold text-slate-700">Preview</h2>
      <pre className="mt-3 max-h-52 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        {preview}
        {totalMarks > 7 ? "\n…" : ""}
      </pre>

      {/* Explicit format buttons */}
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("pdf")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-4 text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(239,68,68,0.7)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <FileText className="h-5 w-5" />
          {busy === "pdf" ? "Preparing PDF…" : "Export as PDF"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("xlsx")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Sheet className="h-5 w-5" />
          {busy === "xlsx" ? "Preparing Excel…" : "Export as Excel (.xlsx)"}
        </button>
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void runExport(format)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-4 text-[16px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.98]"
      >
        {done ? (
          <>
            <Check className="h-5 w-5" />
            Exported
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Export {format.toUpperCase()}
          </>
        )}
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void runAll()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-bold text-slate-700 ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
      >
        <Download className="h-4 w-4 text-blue-600" />
        Download all (PDF + Excel + CSV)
      </button>

      <AppFooterTag className="mt-6" />
    </ScreenShell>
  )
}

function FormatCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-transform active:scale-[0.98] ${
        active ? "bg-blue-600 text-white ring-2 ring-blue-600" : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      <span className={active ? "text-white" : "text-blue-600"}>{icon}</span>
      <span className="text-[16px] font-bold">{title}</span>
      <span className={`text-sm ${active ? "text-blue-100" : "text-slate-400"}`}>{desc}</span>
    </button>
  )
}
