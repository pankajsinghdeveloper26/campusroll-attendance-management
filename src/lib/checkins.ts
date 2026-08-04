import { useSyncExternalStore } from "react"
import type { AttendanceStatus } from "@/lib/attendance-history"

/**
 * Pending student self check-ins for the current class.
 * Keyed by roll number ("01".."80"). Consumed by the live session screen,
 * which pre-marks those students, and cleared when a session is finalized.
 */
export type CheckinMap = Record<string, AttendanceStatus>

const STORAGE_KEY = "campusroll.checkins.v1"

let checkins: CheckinMap = {}
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkins))
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
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const next: CheckinMap = {}
        for (const [roll, status] of Object.entries(parsed as Record<string, unknown>)) {
          if (status === "PRESENT" || status === "ABSENT" || status === "LATE") next[roll] = status
        }
        checkins = next
      }
    }
  } catch {
    checkins = {}
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
  return checkins
}

function getServerSnapshot() {
  return checkins
}

export function recordCheckin(roll: string, status: AttendanceStatus = "PRESENT") {
  if (!hydrated) hydrate()
  checkins = { ...checkins, [roll]: status }
  persist()
  emit()
}

export function clearCheckins() {
  checkins = {}
  persist()
  emit()
}

export function useCheckins() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}