import { useSyncExternalStore } from "react"

export type Student = {
  roll: string // "01" .. "80"
  name: string
  /** Optional CR-edited email override. Falls back to a derived address. */
  email?: string | undefined
}

const STORAGE_KEY = "campusroll.roster.v1"
const TOTAL_STUDENTS = 80

function buildDefaultRoster(): Student[] {
  return Array.from({ length: TOTAL_STUDENTS }, (_, i) => ({
    roll: String(i + 1).padStart(2, "0"),
    name: "",
  }))
}

let roster: Student[] = buildDefaultRoster()
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roster))
  } catch {
    // storage unavailable — keep in-memory state
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Student[]
      if (Array.isArray(parsed) && parsed.length === TOTAL_STUDENTS) {
        roster = parsed.map((s, i) => ({
          roll: s?.roll ?? String(i + 1).padStart(2, "0"),
          name: typeof s?.name === "string" ? s.name : "",
          email: typeof s?.email === "string" ? s.email : undefined,
        }))
      }
    }
  } catch {
    roster = buildDefaultRoster()
  }
}

function subscribe(cb: () => void) {
  // Ensure we read from localStorage on first client subscription.
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
  return roster
}

function getServerSnapshot() {
  return roster
}

export function setStudentName(roll: string, name: string) {
  roster = roster.map((s) => (s.roll === roll ? { ...s, name } : s))
  persist()
  emit()
}

/** Set (or clear, with an empty string) a student's email override. */
export function setStudentEmail(roll: string, email: string) {
  const next = email.trim()
  roster = roster.map((s) => (s.roll === roll ? { ...s, email: next ? next : undefined } : s))
  persist()
  emit()
}

/**
 * Bulk import names. Accepts newline-separated names (in roll order starting at 01)
 * or "01, Name" / "1: Name" style lines. Blank lines keep the existing name.
 */
export function bulkImportNames(text: string) {
  const lines = text.split(/\r?\n/)
  const next = [...roster]

  const rollLinePattern = /^\s*(\d{1,2})\s*[.,:)-]\s*(.+)$/

  let sequentialIndex = 0
  for (const line of lines) {
    const match = line.match(rollLinePattern)
    if (match) {
      const idx = Number.parseInt(match[1] ?? "0", 10) - 1
      const current = next[idx]
      if (current) {
        next[idx] = { ...current, name: (match[2] ?? "").trim() }
      }
      continue
    }
    // Sequential mode: assign non-empty lines to roll positions in order.
    const trimmed = line.trim()
    const currentSeq = next[sequentialIndex]
    if (currentSeq) {
      if (trimmed.length > 0) {
        next[sequentialIndex] = { ...currentSeq, name: trimmed }
      }
      sequentialIndex++
    }
  }

  roster = next
  persist()
  emit()
}

export function resetRoster() {
  roster = buildDefaultRoster()
  persist()
  emit()
}

export function useRoster() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function countNamed(list: Student[]) {
  return list.filter((s) => s.name.trim().length > 0).length
}

/**
 * Derive a stable institutional email for a student from their name + roll.
 * Used for display in the live session roster. If no name is set yet we fall
 * back to a roll-based address so the field is never empty.
 */
export function studentEmail(student: Student) {
  if (student.email && student.email.trim()) return student.email.trim()
  const base = student.name.trim()
    ? student.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")
    : `student${student.roll}`
  return `${base}${student.roll}@ymca.bca.edu`
}

export { TOTAL_STUDENTS }
