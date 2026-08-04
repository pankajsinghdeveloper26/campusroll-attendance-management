import type React from "react"
import { useEffect, useState } from "react"
import {
  GraduationCap,
  Bell,
  ChevronsUpDown,
  Users,
  Play,
  QrCode,
  FileDown,
  BarChart3,
  CalendarCheck,
  Percent,
  UserCheck,
  TrendingUp,
  ClipboardList,
  Home,
  UsersRound,
  Clock,
  SlidersHorizontal,
  CheckCircle2,
  Download,
  UserRoundCheck,
} from "lucide-react"
import { useRoster, countNamed } from "@/lib/roster"
import {
  useAttendanceHistory,
  computeStats,
  exportSessionCsv,
  formatDisplayDate,
  type AttendanceSession,
} from "@/lib/attendance-history"
import { RosterPanel } from "@/components/roster-screen"
import { HistoryPanel } from "@/components/history-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { LiveSessionScreen } from "@/components/live-session-screen"
import { QrCheckinScreen } from "@/components/qr-checkin-screen"
import { ExportScreen } from "@/components/export-screen"
import { StudentCheckinScreen } from "@/components/student-checkin-screen"
import { AppFooterTag } from "@/components/app-footer-tag"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnalyticsModal } from "@/components/analytics-modal"
import { CrStickyNotes } from "@/components/cr-sticky-notes"
import { AttendanceHelp } from "@/components/attendance-help"
import { registerBackHandler } from "@/lib/back-guard"

type Tab = "home" | "roster" | "history" | "settings"
type Overlay = "none" | "live" | "qr" | "export" | "checkin"

export function CrDashboard({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [overlay, setOverlay] = useState<Overlay>("none")
  const [toast, setToast] = useState<string | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  // Back button: close analytics, then fall back to the Home tab.
  useEffect(
    () =>
      registerBackHandler(() => {
        if (analyticsOpen) {
          setAnalyticsOpen(false)
          return true
        }
        if (activeTab !== "home") {
          setActiveTab("home")
          return true
        }
        return false
      }),
    [analyticsOpen, activeTab],
  )

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // Full-screen overlays take priority over the tabbed layout.
  if (overlay === "live")
    return (
      <LiveSessionScreen
        onBack={() => setOverlay("none")}
        onFinalized={(s) => {
          setOverlay("none")
          setActiveTab("home")
          setToast(`Attendance locked · ${s.presentCount}/${s.total} present (${s.percentage}%)`)
        }}
      />
    )
  if (overlay === "qr") return <QrCheckinScreen onBack={() => setOverlay("none")} />
  if (overlay === "export") return <ExportScreen onBack={() => setOverlay("none")} />
  if (overlay === "checkin") return <StudentCheckinScreen onBack={() => setOverlay("none")} />

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      {/* Phone frame */}
      <div className="relative flex min-h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white sm:min-h-[860px] sm:rounded-[2.5rem] sm:border sm:border-slate-200 sm:shadow-xl">
        {/* Success toast */}
        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-6">
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.6)]"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              {toast}
            </div>
          </div>
        ) : null}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-12">
          {activeTab === "home" ? (
            <HomePanel
              onBack={onBack}
              onStartSession={() => setOverlay("live")}
              onQr={() => setOverlay("qr")}
              onExport={() => setOverlay("export")}
              onSelfCheckin={() => setOverlay("checkin")}
              onViewHistory={() => setActiveTab("history")}
              onAnalytics={() => setAnalyticsOpen(true)}
              onManageRoster={() => setActiveTab("roster")}
            />
          ) : null}
          {activeTab === "roster" ? <RosterPanel /> : null}
          {activeTab === "history" ? <HistoryPanel /> : null}
          {activeTab === "settings" ? <SettingsPanel onSignOut={onBack} /> : null}
        </div>

        {/* Bottom nav */}
        <nav className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-100 bg-white/95 px-4 pb-6 pt-3 backdrop-blur">
          <NavTab icon={<Home className="h-5 w-5" />} label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
          <NavTab icon={<UsersRound className="h-5 w-5" />} label="Roster" active={activeTab === "roster"} onClick={() => setActiveTab("roster")} />
          <NavTab icon={<Clock className="h-5 w-5" />} label="History" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <NavTab icon={<SlidersHorizontal className="h-5 w-5" />} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </nav>

        <AttendanceHelp />

        {analyticsOpen ? <AnalyticsModal onClose={() => setAnalyticsOpen(false)} /> : null}
      </div>
    </main>
  )
}

function HomePanel({
  onBack,
  onStartSession,
  onQr,
  onExport,
  onSelfCheckin,
  onViewHistory,
  onAnalytics,
  onManageRoster,
}: {
  onBack: () => void
  onStartSession: () => void
  onQr: () => void
  onExport: () => void
  onSelfCheckin: () => void
  onViewHistory: () => void
  onAnalytics: () => void
  onManageRoster: () => void
}) {
  const roster = useRoster()
  const named = countNamed(roster)
  const history = useAttendanceHistory()
  const stats = computeStats(history)
  const recent = history.slice(0, 4)

  return (
    <>
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">YMCA BCA Data Science</p>
          <h1 className="text-[26px] font-bold leading-tight text-slate-900">Welcome, CR</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition-transform active:scale-95"
          >
            <Bell className="h-5 w-5" />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to role selection"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.6)] transition-transform active:scale-95"
          >
            CR
          </button>
        </div>
      </header>

      {/* Active class selector */}
      <button
        type="button"
        onClick={onManageRoster}
        className="mt-6 flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-[0_10px_25px_-14px_rgba(15,23,42,0.3)] ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
          <GraduationCap className="h-7 w-7 text-blue-600" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-400">Active Class</span>
          <span className="block truncate text-[17px] font-bold text-slate-900">BCA Data Science — Section A</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            {roster.length} Enrolled Students
          </span>
        </span>
        <ChevronsUpDown className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      {/* Primary action */}
      <button
        type="button"
        onClick={onStartSession}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full bg-emerald-500 px-6 py-5 text-[18px] font-bold text-white shadow-[0_16px_34px_-10px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.98]"
      >
        <Play className="h-5 w-5 fill-white" />
        Start Live Attendance Session
      </button>

      {/* Student self check-in */}
      <button
        type="button"
        onClick={onSelfCheckin}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-6 py-4 text-[16px] font-bold text-slate-700 shadow-[0_10px_25px_-16px_rgba(15,23,42,0.4)] ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
      >
        <UserRoundCheck className="h-5 w-5 text-blue-600" />
        Student Self Check-In
      </button>

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <QuickAction icon={<QrCode className="h-6 w-6" />} label="QR Check-in" onClick={onQr} />
        <QuickAction icon={<FileDown className="h-6 w-6" />} label="Export Sheet" onClick={onExport} />
        <QuickAction icon={<BarChart3 className="h-6 w-6" />} label="Analytics" onClick={onAnalytics} />
      </div>

      <CrStickyNotes className="mt-6" />

      {/* Summary */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[19px] font-bold text-slate-900">Summary</h2>
        <button type="button" onClick={onViewHistory} className="text-sm font-semibold text-blue-600">
          View all
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <StatCard
          icon={<CalendarCheck className="h-5 w-5 text-slate-500" />}
          label="Total Classes Held"
          value={String(stats.totalClasses)}
          footer={stats.totalClasses === 0 ? "No sessions yet" : "finalized sessions"}
        />
        <StatCard
          highlight
          icon={<Percent className="h-5 w-5 text-blue-600" />}
          label="Overall Attendance"
          value={`${stats.overallPercentage}%`}
          valueClassName="text-blue-600"
          footer="avg across sessions"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-slate-500" />}
          label="Avg. Present / Class"
          value={stats.totalClasses === 0 ? "—" : String(stats.avgPresent)}
          footer={`out of ${roster.length}`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-slate-500" />}
          label="Last Session"
          value={stats.lastSession ? `${stats.lastSession.percentage}%` : "—"}
          valueClassName="text-emerald-600"
          footer={
            stats.lastSession
              ? `${stats.lastSession.presentCount}/${stats.lastSession.totalStudents} present`
              : "not held yet"
          }
        />
      </div>

      {/* Recent activity */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[19px] font-bold text-slate-900">Recent Activity</h2>
        <button type="button" onClick={onViewHistory} className="text-sm font-semibold text-blue-600">
          History
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="mt-4 rounded-3xl bg-white p-6 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[15px] font-bold text-slate-900">No sessions finalized yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Start a live session and tap Finalize &amp; Lock to record your first day.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {recent.map((s) => (
            <PastSessionRow key={s.id} session={s} onView={onViewHistory} />
          ))}
        </div>
      )}

      {named > 0 ? (
        <p className="mt-4 text-center text-xs text-slate-400">{named} student names saved on this device</p>
      ) : null}

      <AppFooterTag className="mt-5" />
    </>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-white px-2 py-5 text-blue-600 shadow-[0_8px_20px_-14px_rgba(15,23,42,0.3)] ring-1 ring-slate-100 transition-transform active:scale-95"
    >
      {icon}
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </button>
  )
}

function StatCard({
  icon,
  label,
  value,
  footer,
  highlight,
  valueClassName = "text-slate-900",
}: {
  icon: React.ReactNode
  label: string
  value: string
  footer?: string
  highlight?: boolean
  valueClassName?: string
}) {
  return (
    <div
      className={`flex flex-col rounded-3xl bg-white p-4 text-left shadow-[0_8px_22px_-16px_rgba(15,23,42,0.35)] ${
        highlight ? "ring-2 ring-blue-500" : "ring-1 ring-slate-100"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">{icon}</span>
      <span className="mt-3 text-sm font-medium leading-snug text-slate-500">{label}</span>
      <span className={`mt-1 text-[26px] font-bold ${valueClassName}`}>{value}</span>
      {footer ? <span className="mt-0.5 text-sm text-slate-400">{footer}</span> : null}
    </div>
  )
}

function PastSessionRow({ session, onView }: { session: AttendanceSession; onView: () => void }) {
  const pct = session.percentage
  const pctClass = pct >= 90 ? "text-emerald-600" : pct >= 80 ? "text-blue-600" : "text-amber-600"
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
      <button type="button" onClick={onView} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
          <ClipboardList className="h-6 w-6 text-slate-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold text-slate-900">
            {formatDisplayDate(session.date)}
          </span>
          <span className="mt-0.5 block text-sm text-slate-400">
            {session.time} · {session.presentCount}/{session.totalStudents}
          </span>
        </span>
        <span className={`text-right text-[16px] font-bold ${pctClass}`}>{pct}%</span>
      </button>
      <button
        type="button"
        onClick={() => exportSessionCsv(session)}
        aria-label={`Export ${formatDisplayDate(session.date)} report`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  )
}

function NavTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`flex h-9 w-14 items-center justify-center rounded-full transition-colors ${
          active ? "bg-blue-50 text-blue-600" : "text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span className={`text-xs font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}>{label}</span>
    </button>
  )
}
