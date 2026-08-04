import { X, TrendingUp, Percent, UserCheck, CalendarCheck } from "lucide-react"
import {
  useAttendanceHistory,
  computeStats,
  formatDisplayDate,
} from "@/lib/attendance-history"

/**
 * Interactive analytics overlay: headline percentages plus lightweight
 * inline charts (no chart library needed at this data size).
 */
export function AnalyticsModal({ onClose }: { onClose: () => void }) {
  const history = useAttendanceHistory()
  const stats = computeStats(history)

  // Oldest -> newest for a natural left-to-right trend.
  const trend = history.slice(0, 12).reverse()
  const totals = history.reduce(
    (acc, s) => ({
      present: acc.present + s.presentCount,
      late: acc.late + s.lateCount,
      absent: acc.absent + s.absentCount,
    }),
    { present: 0, late: 0, absent: 0 },
  )
  const grand = totals.present + totals.late + totals.absent || 1
  const best = history.reduce<null | (typeof history)[number]>(
    (b, s) => (b === null || s.percentage > b.percentage ? s : b),
    null,
  )

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-slate-900/45 px-4 pb-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Attendance analytics"
      onClick={onClose}
    >
      <div
        className="max-h-[86%] w-full overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">Analytics</h2>
            <p className="text-sm text-slate-400">Across {stats.totalClasses} finalized sessions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
            Finalize a live session to unlock attendance analytics.
          </p>
        ) : (
          <>
            {/* Headline stats */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat
                icon={<Percent className="h-4 w-4 text-blue-600" />}
                label="Overall"
                value={`${stats.overallPercentage}%`}
                valueClassName="text-blue-600"
              />
              <MiniStat
                icon={<CalendarCheck className="h-4 w-4 text-slate-500" />}
                label="Sessions"
                value={String(stats.totalClasses)}
              />
              <MiniStat
                icon={<UserCheck className="h-4 w-4 text-slate-500" />}
                label="Avg present"
                value={String(stats.avgPresent)}
              />
              <MiniStat
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                label="Best day"
                value={best ? `${best.percentage}%` : "—"}
                valueClassName="text-emerald-600"
              />
            </div>

            {/* Trend bar chart */}
            <h3 className="mt-6 text-[15px] font-bold text-slate-700">Attendance trend</h3>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-32 items-end gap-1.5">
                {trend.map((s) => (
                  <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${formatDisplayDate(s.date)} · ${s.percentage}%`}>
                    <span className="text-[10px] font-bold text-slate-500">{s.percentage}</span>
                    <span
                      className={`w-full rounded-t-md ${
                        s.percentage >= 90 ? "bg-emerald-500" : s.percentage >= 75 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ height: `${Math.max(4, s.percentage)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>{trend[0] ? formatDisplayDate(trend[0].date) : ""}</span>
                <span>{trend.length > 1 ? formatDisplayDate(trend[trend.length - 1]!.date) : ""}</span>
              </div>
            </div>

            {/* Status split */}
            <h3 className="mt-6 text-[15px] font-bold text-slate-700">Status split</h3>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <span className="bg-emerald-500" style={{ width: `${(totals.present / grand) * 100}%` }} />
                <span className="bg-amber-500" style={{ width: `${(totals.late / grand) * 100}%` }} />
                <span className="bg-rose-500" style={{ width: `${(totals.absent / grand) * 100}%` }} />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <SplitRow color="bg-emerald-500" label="Present" count={totals.present} grand={grand} />
                <SplitRow color="bg-amber-500" label="Late" count={totals.late} grand={grand} />
                <SplitRow color="bg-rose-500" label="Absent" count={totals.absent} grand={grand} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">{icon}</span>
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-[22px] font-bold ${valueClassName}`}>{value}</p>
    </div>
  )
}

function SplitRow({ color, label, count, grand }: { color: string; label: string; count: number; grand: number }) {
  const pct = Math.round((count / grand) * 100)
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="flex-1 text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-sm text-slate-400">{count} marks</span>
      <span className="w-10 text-right text-sm font-bold text-slate-900">{pct}%</span>
    </div>
  )
}
