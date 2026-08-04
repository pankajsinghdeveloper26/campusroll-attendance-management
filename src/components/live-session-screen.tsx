import { useEffect, useMemo, useRef, useState } from "react"
import { Lock, Search, X, Check, Clock, UserRound, Mail, Pencil } from "lucide-react"
import { useRoster, studentEmail, setStudentEmail, type Student } from "@/lib/roster"
import { finalizeSession, type StudentRecord, type AttendanceStatus } from "@/lib/attendance-history"
import { useCheckins, clearCheckins } from "@/lib/checkins"

const SESSION_SECONDS = 135 // 02:15 countdown

type MarkStatus = AttendanceStatus // "PRESENT" | "ABSENT" | "LATE"
type StatusFilter = "ALL" | "PRESENT" | "ABSENT" | "LATE"

function rollCode(roll: string) {
  return `BCA-DS-0${roll}`
}

function displayName(student: Student) {
  return student.name.trim() ? student.name.trim() : `Student ${student.roll}`
}

function initials(student: Student) {
  const name = student.name.trim()
  if (!name) return student.roll
  const parts = name.split(/\s+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  return letters.toUpperCase() || student.roll
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

export function LiveSessionScreen({
  onBack,
  onFinalized,
}: {
  onBack: () => void
  onFinalized?: (summary: { presentCount: number; total: number; percentage: number }) => void
}) {
  const roster = useRoster()
  const total = roster.length
  const [locking, setLocking] = useState(false)
  const checkins = useCheckins()

  // Roll -> status. Everyone starts ABSENT until the CR marks them.
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({})

  // Seed marks from student self check-ins (they mark themselves present/late).
  useEffect(() => {
    setMarks((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [roll, status] of Object.entries(checkins)) {
        if (next[roll] !== status) {
          next[roll] = status
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [checkins])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("ALL")
  const [remaining, setRemaining] = useState(SESSION_SECONDS)
  const startRef = useRef(Date.now())
  const listRef = useRef<HTMLDivElement>(null)

  // Countdown timer (visual only — never marks attendance automatically).
  useEffect(() => {
    const t = setInterval(() => {
      const gone = Math.floor((Date.now() - startRef.current) / 1000)
      setRemaining(Math.max(0, SESSION_SECONDS - gone))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  function statusOf(roll: string): MarkStatus {
    return marks[roll] ?? "ABSENT"
  }

  function setStatus(roll: string, status: MarkStatus) {
    setMarks((prev) => ({ ...prev, [roll]: status }))
  }

  // Live counts across the whole roster (not just the filtered view).
  const presentCount = useMemo(() => roster.filter((s) => statusOf(s.roll) === "PRESENT").length, [roster, marks])
  const lateCount = useMemo(() => roster.filter((s) => statusOf(s.roll) === "LATE").length, [roster, marks])
  const absentCount = total - presentCount - lateCount
  const attended = presentCount + lateCount
  const pct = total === 0 ? 0 : Math.round((attended / total) * 100)

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0")
  const ss = String(remaining % 60).padStart(2, "0")

  // Sort roster alphabetically by display name for the A-Z index to be meaningful.
  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [roster],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortedRoster.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.roll.includes(q) ||
        rollCode(s.roll).toLowerCase().includes(q)
      const matchesFilter = filter === "ALL" || statusOf(s.roll) === filter
      return matchesQuery && matchesFilter
    })
  }, [sortedRoster, query, filter, marks])

  // Letters that actually have a student, for the quick-jump index.
  const activeLetters = useMemo(() => {
    const set = new Set<string>()
    for (const s of sortedRoster) {
      const first = displayName(s)[0]?.toUpperCase()
      if (first && first >= "A" && first <= "Z") set.add(first)
    }
    return set
  }, [sortedRoster])

  function jumpTo(letter: string) {
    const container = listRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(`[data-letter="${letter}"]`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleFinalize() {
    if (locking) return
    setLocking(true)
    const records: StudentRecord[] = roster.map((s) => ({
      studentId: s.roll,
      name: displayName(s),
      rollNo: rollCode(s.roll),
      email: studentEmail(s),
      status: statusOf(s.roll),
    }))
    const saved = finalizeSession(records)
    clearCheckins()
    onFinalized?.({
      presentCount: saved.presentCount,
      total: saved.totalStudents,
      percentage: saved.percentage,
    })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="relative flex min-h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-slate-50 sm:min-h-[860px] sm:rounded-[2.5rem] sm:border sm:border-slate-200 sm:shadow-xl">
        {/* Black GPS header */}
        <header className="bg-slate-950 px-6 pb-5 pt-10 text-white">
          <div className="flex items-start gap-2.5">
            <span className="relative mt-1 flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <p className="text-[15px] font-bold leading-snug text-blue-400">
              GPS Geofence Active (30m Radius - YMCA Campus)
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-sm font-medium text-slate-400">Time Remaining</span>
            <span className="font-mono text-[34px] font-bold leading-none tabular-nums">
              {mm}:{ss}
            </span>
            <span className="text-sm font-medium text-slate-400">mins</span>
          </div>
        </header>

        {/* Sub-header + live stats */}
        <div className="border-b border-slate-200 bg-white px-6 pb-4 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">YMCA BCA Data Science</p>
          <h1 className="mt-1 text-[24px] font-bold leading-tight text-slate-900">Live Attendance Session</h1>

          {/* Progress bar */}
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-slate-400">
            <span className="font-bold text-slate-700 tabular-nums">{attended}</span> / {total} marked attended ·{" "}
            <span className="font-bold text-slate-700 tabular-nums">{pct}%</span>
          </p>

          {/* Dynamic stat badges */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <StatBadge label="Present" value={presentCount} tone="emerald" />
            <StatBadge label="Late" value={lateCount} tone="amber" />
            <StatBadge label="Absent" value={absentCount} tone="red" />
          </div>

          {/* Search */}
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or roll number"
              className="w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            ) : null}
          </div>

          {/* Filter chips */}
          <div className="mt-3 flex gap-2">
            <FilterChip label="All" count={total} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
            <FilterChip
              label="Present"
              count={presentCount}
              active={filter === "PRESENT"}
              onClick={() => setFilter("PRESENT")}
            />
            <FilterChip
              label="Absent"
              count={absentCount}
              active={filter === "ABSENT"}
              onClick={() => setFilter("ABSENT")}
            />
          </div>
        </div>

        {/* Roster list + A-Z index */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={listRef} className="h-full overflow-y-auto px-6 pb-40 pt-4 pr-9">
            {filtered.length === 0 ? (
              <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
                <UserRound className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-[15px] font-bold text-slate-900">No students match</p>
                <p className="mt-1 text-sm text-slate-400">Adjust your search or filter.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {filtered.map((s, i) => {
                  const letter = displayName(s)[0]?.toUpperCase() ?? "#"
                  const prev = i > 0 ? filtered[i - 1] : undefined
                  const prevLetter = prev ? (displayName(prev)[0]?.toUpperCase() ?? "#") : null
                  const showAnchor = letter !== prevLetter
                  return (
                    <StudentSessionRow
                      key={s.roll}
                      student={s}
                      status={statusOf(s.roll)}
                      onSetStatus={(st) => setStatus(s.roll, st)}
                      {...(showAnchor ? { anchorLetter: letter } : {})}
                    />
                  )
                })}
              </ul>
            )}
          </div>

          {/* A-Z quick jump index */}
          <nav
            aria-label="Jump to letter"
            className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col items-center gap-px"
          >
            {ALPHABET.map((letter) => {
              const enabled = activeLetters.has(letter)
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!enabled}
                  onClick={() => jumpTo(letter)}
                  className={`text-[9px] font-bold leading-none ${
                    enabled ? "text-blue-600 hover:text-blue-800" : "cursor-default text-slate-300"
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sticky footer */}
        <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-2xl border-2 border-red-300 py-3.5 text-[15px] font-bold text-red-500 transition-colors hover:bg-red-50 active:scale-[0.98]"
          >
            End Session Early
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={locking}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(37,99,235,0.7)] transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <Lock className="h-4 w-4" />
            {locking ? "Locking…" : "Finalize & Lock Attendance"}
          </button>
        </div>
      </div>
    </main>
  )
}

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "emerald" | "amber" | "red"
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-600 ring-red-100",
  } as const
  return (
    <div className={`flex flex-col items-center rounded-2xl px-2 py-2.5 ring-1 ${tones[tone]}`}>
      <span className="text-[22px] font-bold leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-xs font-semibold">{label}</span>
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-xs tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-white text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function StudentSessionRow({
  student,
  status,
  onSetStatus,
  anchorLetter,
}: {
  student: Student
  status: MarkStatus
  onSetStatus: (status: MarkStatus) => void
  anchorLetter?: string
}) {
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(studentEmail(student))

  function saveEmail() {
    setStudentEmail(student.roll, emailDraft)
    setEditingEmail(false)
  }

  const avatarTone =
    status === "PRESENT"
      ? "bg-emerald-50 text-emerald-600"
      : status === "LATE"
        ? "bg-amber-50 text-amber-600"
        : "bg-slate-100 text-slate-500"

  return (
    <li data-letter={anchorLetter} className="scroll-mt-4">
      {anchorLetter ? (
        <p className="mb-1.5 mt-1 pl-1 text-xs font-bold uppercase tracking-wide text-slate-400">{anchorLetter}</p>
      ) : null}
      <div className="rounded-2xl bg-white p-3 shadow-[0_6px_16px_-14px_rgba(15,23,42,0.4)] ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarTone}`}>
            {initials(student)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold text-slate-900">{displayName(student)}</span>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                {rollCode(student.roll)}
              </span>
            </div>
            {editingEmail ? (
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  autoFocus
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEmail()
                    if (e.key === "Escape") {
                      setEmailDraft(studentEmail(student))
                      setEditingEmail(false)
                    }
                  }}
                  aria-label={`Email for ${displayName(student)}`}
                  className="min-w-0 flex-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={saveEmail}
                  aria-label="Save email"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform active:scale-90"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDraft(studentEmail(student))
                    setEditingEmail(false)
                  }}
                  aria-label="Cancel email edit"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEmailDraft(studentEmail(student))
                  setEditingEmail(true)
                }}
                className="mt-0.5 flex w-full min-w-0 items-center gap-1.5 text-left"
              >
                <Mail className="h-3 w-3 shrink-0 text-slate-300" />
                <span className="truncate text-xs text-slate-400">{studentEmail(student)}</span>
                <Pencil className="h-3 w-3 shrink-0 text-slate-300" />
              </button>
            )}
          </div>
        </div>

        {/* P / A / L toggle buttons */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ToggleButton
            active={status === "PRESENT"}
            onClick={() => onSetStatus("PRESENT")}
            activeClass="bg-emerald-500 text-white ring-emerald-500"
            idleClass="text-emerald-600 ring-emerald-200 hover:bg-emerald-50"
            icon={<Check className="h-4 w-4" strokeWidth={3} />}
            label="Present"
          />
          <ToggleButton
            active={status === "ABSENT"}
            onClick={() => onSetStatus("ABSENT")}
            activeClass="bg-red-500 text-white ring-red-500"
            idleClass="text-red-500 ring-red-200 hover:bg-red-50"
            icon={<X className="h-4 w-4" strokeWidth={3} />}
            label="Absent"
          />
          <ToggleButton
            active={status === "LATE"}
            onClick={() => onSetStatus("LATE")}
            activeClass="bg-amber-500 text-white ring-amber-500"
            idleClass="text-amber-600 ring-amber-200 hover:bg-amber-50"
            icon={<Clock className="h-4 w-4" strokeWidth={2.5} />}
            label="Late"
          />
        </div>
      </div>
    </li>
  )
}

function ToggleButton({
  active,
  onClick,
  activeClass,
  idleClass,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  activeClass: string
  idleClass: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold ring-1 transition-colors active:scale-95 ${
        active ? activeClass : `bg-white ${idleClass}`
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
