import { useMemo, useState } from "react"
import {
  ClipboardList,
  CalendarDays,
  Download,
  ChevronDown,
  Check,
  X,
  Trash2,
  Clock,
  FileText,
  Sheet,
} from "lucide-react"
import {
  useAttendanceHistory,
  computeStats,
  exportSessionCsv,
  deleteSession,
  formatDisplayDate,
  type AttendanceSession,
} from "@/lib/attendance-history"
import { exportSessionPdf, exportSessionXlsx, exportHistoryPdf, exportHistoryXlsx } from "@/lib/export-reports"

export function HistoryPanel() {
  const history = useAttendanceHistory()
  const stats = computeStats(history)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [filterDate, setFilterDate] = useState<string>("")

  // Distinct dates that actually have records, newest first — used for quick chips.
  const availableDates = useMemo(() => {
    const seen = new Set<string>()
    for (const s of history) seen.add(s.date)
    return Array.from(seen)
  }, [history])

  const filtered = useMemo(
    () => (filterDate ? history.filter((s) => s.date === filterDate) : history),
    [history, filterDate],
  )

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-slate-900">Attendance History</h1>
          <p className="text-sm font-medium text-slate-400">
            {history.length === 0
              ? "No sessions recorded yet"
              : filterDate
                ? `${filtered.length} session${filtered.length === 1 ? "" : "s"} on ${formatDisplayDate(filterDate)}`
                : `${history.length} session${history.length === 1 ? "" : "s"} · ${stats.overallPercentage}% overall`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Filter attendance records by date"
          className={`relative flex h-11 w-11 items-center justify-center rounded-full shadow-sm ring-1 transition-colors ${
            filterDate
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white text-slate-500 ring-slate-100 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          {filterDate ? (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          ) : null}
        </button>
      </div>

      {/* Active filter chip */}
      {filterDate ? (
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {formatDisplayDate(filterDate)}
            <button
              type="button"
              onClick={() => setFilterDate("")}
              aria-label="Clear date filter"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-200 text-blue-700 hover:bg-blue-300"
            >
              <X className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
          </span>
        </div>
      ) : null}

      {history.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
          <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-[16px] font-bold text-slate-900">Nothing here yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Finalized live sessions will appear here with daily percentages you can view and export.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
          <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-[16px] font-bold text-slate-900">No sessions on this date</p>
          <p className="mt-1 text-sm text-slate-400">Try a different date or clear the filter.</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {filtered.map((s) => (
            <HistoryRow key={s.id} session={s} />
          ))}
        </ul>
      )}

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void exportHistoryPdf(filtered)}
            className="flex items-center justify-center gap-2 rounded-full bg-red-500 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <FileText className="h-4 w-4" />
            Export as PDF
          </button>
          <button
            type="button"
            onClick={() => void exportHistoryXlsx(filtered)}
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Sheet className="h-4 w-4" />
            Export as Excel (.xlsx)
          </button>
        </div>
      ) : null}

      {pickerOpen ? (
        <DatePickerModal
          value={filterDate}
          availableDates={availableDates}
          onApply={(d) => {
            setFilterDate(d)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  )
}

function DatePickerModal({
  value,
  availableDates,
  onApply,
  onClose,
}: {
  value: string
  availableDates: string[]
  onApply: (date: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close date picker" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-[0_-16px_40px_-12px_rgba(15,23,42,0.4)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">Filter by date</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-600" htmlFor="history-date">
          Pick a date
        </label>
        <input
          id="history-date"
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {availableDates.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recorded days</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableDates.slice(0, 8).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDraft(d)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    draft === d ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {formatDisplayDate(d)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => onApply("")}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-[15px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={!draft}
            className="flex-1 rounded-2xl bg-blue-600 py-3 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(37,99,235,0.7)] transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            Apply filter
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryRow({ session }: { session: AttendanceSession }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const pct = session.percentage
  const pctClass = pct >= 90 ? "text-emerald-600" : pct >= 80 ? "text-blue-600" : "text-amber-600"
  const barClass = pct >= 90 ? "bg-emerald-500" : pct >= 80 ? "bg-blue-500" : "bg-amber-500"

  return (
    <li className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
      <div className="flex items-center gap-4 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
          <ClipboardList className="h-6 w-6 text-slate-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-slate-900">{formatDisplayDate(session.date)}</p>
          <p className="mt-0.5 text-sm text-slate-400">
            {session.time} · {session.presentCount}/{session.totalStudents} present
            {session.lateCount > 0 ? ` · ${session.lateCount} late` : ""}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-right">
          <p className={`text-[16px] font-bold ${pctClass}`}>{pct}%</p>
          <p className="mt-0.5 text-sm text-slate-400">{session.date}</p>
        </div>
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete ? (
        <div className="flex items-center gap-3 border-t border-slate-100 bg-red-50/70 px-4 py-3">
          <p className="flex-1 text-sm font-medium text-red-700">Delete this session permanently?</p>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => deleteSession(session.id)}
            className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-transform active:scale-95"
          >
            Delete
          </button>
        </div>
      ) : (
        /* Quick actions */
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Hide" : "View"}
          </button>
          <span className="w-px bg-slate-100" />
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            aria-expanded={exportOpen}
            className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <span className="w-px bg-slate-100" />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete session from ${formatDisplayDate(session.date)}`}
            className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {exportOpen && !confirmDelete ? (
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
          <button
            type="button"
            onClick={() => void exportSessionPdf(session)}
            className="flex items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <FileText className="h-4 w-4" />
            Export as PDF
          </button>
          <button
            type="button"
            onClick={() => void exportSessionXlsx(session)}
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Sheet className="h-4 w-4" />
            Export as Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => void exportSessionCsv(session)}
            className="flex items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-blue-600" />
            Export as CSV
          </button>
        </div>
      ) : null}

      {/* Expanded detail */}
      {open ? (
        <ul className="max-h-72 overflow-y-auto border-t border-slate-100 bg-slate-50/60">
          {session.records.map((r) => (
            <li
              key={r.studentId}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  r.status === "PRESENT"
                    ? "bg-emerald-500 text-white"
                    : r.status === "LATE"
                      ? "bg-amber-500 text-white"
                      : "bg-red-100 text-red-500"
                }`}
              >
                {r.status === "PRESENT" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : r.status === "LATE" ? (
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{r.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{r.rollNo}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
