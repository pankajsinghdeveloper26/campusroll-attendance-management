import { useSyncExternalStore } from "react"

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE"

export type StudentRecord = {
  studentId: string // roll number "01".."80" — stable id on this device
  name: string
  rollNo: string
  email?: string | undefined
  status: AttendanceStatus
}

export type AttendanceSession = {
  id: string // unique per finalized session (multiple sessions per day allowed)
  date: string // "YYYY-MM-DD"
  time: string // "10:44 AM"
  totalStudents: number // 80
  presentCount: number
  absentCount: number
  lateCount: number
  percentage: number // 0-100, rounded — late students count toward attendance
  records: StudentRecord[]
}

const STORAGE_KEY = "campusroll_attendance_history"

let history: AttendanceSession[] = []
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // storage unavailable — keep in-memory state
  }
}

function isValidSession(s: unknown): s is AttendanceSession {
  if (!s || typeof s !== "object") return false
  const o = s as Record<string, unknown>
  return typeof o["id"] === "string" && typeof o["date"] === "string" && Array.isArray(o["records"])
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Backfill lateCount for sessions saved before LATE was supported.
        history = parsed.filter(isValidSession).map((s) => ({
          ...s,
          lateCount: typeof s.lateCount === "number" ? s.lateCount : 0,
        }))
      }
    }
  } catch {
    history = []
  }
}

function subscribe(cb: () => void) {
  if (!hydrated) {
    hydrate()
    emit()
  }
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      hydrated = false
      hydrate()
      emit()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot() {
  return history
}

function getServerSnapshot() {
  return history
}

function todayKey(d = new Date()) {
  // Local calendar date as YYYY-MM-DD.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatClock(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function newSessionId(now: Date) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${now.getTime()}-${rnd}`
}

const RETENTION_DAYS = 365

function withinRetention(list: AttendanceSession[]): AttendanceSession[] {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffKey = todayKey(cutoff)
  return list.filter((s) => s.date >= cutoffKey)
}

/**
 * Finalize and lock the current live session into history.
 * Always appends a NEW entry — multiple sessions can be recorded on the same
 * day and each is retained independently. Retention keeps the trailing 365
 * days of logs. Returns the saved session.
 */
export function finalizeSession(records: StudentRecord[]): AttendanceSession {
  if (!hydrated) hydrate()

  const now = new Date()
  const date = todayKey(now)
  const total = records.length
  const presentCount = records.filter((r) => r.status === "PRESENT").length
  const lateCount = records.filter((r) => r.status === "LATE").length
  const absentCount = total - presentCount - lateCount
  // Present + late both count as attended for the percentage.
  const attended = presentCount + lateCount
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 100)

  const session: AttendanceSession = {
    id: newSessionId(now),
    date,
    time: formatClock(now),
    totalStudents: total,
    presentCount,
    absentCount,
    lateCount,
    percentage,
    records,
  }

  // Always append (newest first) and drop anything past the retention window.
  history = withinRetention([session, ...history])

  persist()
  emit()
  return session
}

/** Remove a single finalized session by id (e.g. an erroneous record). */
export function deleteSession(id: string) {
  if (!hydrated) hydrate()
  history = history.filter((s) => s.id !== id)
  persist()
  emit()
}

export function clearHistory() {
  history = []
  persist()
  emit()
}

export function useAttendanceHistory() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export type HistoryStats = {
  totalClasses: number
  overallPercentage: number // average across sessions
  lastSession: AttendanceSession | null
  avgPresent: number
}

export function computeStats(list: AttendanceSession[]): HistoryStats {
  const totalClasses = list.length
  if (totalClasses === 0) {
    return { totalClasses: 0, overallPercentage: 0, lastSession: null, avgPresent: 0 }
  }
  const overallPercentage = Math.round(
    list.reduce((sum, s) => sum + s.percentage, 0) / totalClasses,
  )
  const avgPresent = Math.round((list.reduce((sum, s) => sum + s.presentCount, 0) / totalClasses) * 10) / 10
  // History is maintained newest-first, so the head is the most recent session.
  const lastSession = list[0] ?? null
  return { totalClasses, overallPercentage, lastSession, avgPresent }
}

/**
 * Build a CSV report for a single finalized session and share (mobile) or
 * download (desktop) it as a real file.
 */
export async function exportSessionCsv(session: AttendanceSession) {
  if (typeof window === "undefined") return
  const header = "Roll,Name,Email,Status"
  const rows = session.records.map(
    (r) =>
      `${r.rollNo},"${(r.name || "—").replace(/"/g, '""')}","${(r.email || "").replace(/"/g, '""')}",${r.status}`,
  )
  const summary = [
    "",
    `Date,${session.date}`,
    `Time,${session.time}`,
    `Present,${session.presentCount}`,
    `Late,${session.lateCount}`,
    `Absent,${session.absentCount}`,
    `Percentage,${session.percentage}%`,
  ]
  const content = [header, ...rows, ...summary].join("\n")
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" })
  const { deliverFile } = await import("@/lib/share-export")
  await deliverFile(blob, `attendance-${session.date}.csv`, {
    title: `CampusRoll attendance ${session.date}`,
  })
}

export function formatDisplayDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((n) => Number.parseInt(n, 10))
  const dt = new Date(y ?? 1970, (m || 1) - 1, d || 1)
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
}
