/**
 * Stable per-device / per-browser identifier used for the anti-cheat device lock.
 * One device can only claim a single roll number per session.
 */
const DEVICE_KEY = "campusroll.device.v1"

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server"
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const id =
      (window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`) + ""
    window.localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return "unavailable"
  }
}

const LOCK_KEY = "campusroll.devicelock.v1"

type LockMap = Record<string, { roll: string; deviceId: string; at: number }>

function readLocks(): LockMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(LOCK_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as LockMap
    return {}
  } catch {
    return {}
  }
}

function writeLocks(map: LockMap) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/** Which roll number (if any) this device already used for the given session. */
export function lockedRollFor(sessionId: string): string | null {
  const entry = readLocks()[sessionId]
  if (!entry) return null
  return entry.deviceId === getDeviceId() ? entry.roll : null
}

/**
 * Binds a roll number to this device for a session.
 * Returns false when the device already checked in as a different student.
 */
export function claimDeviceLock(sessionId: string, roll: string): boolean {
  const existing = lockedRollFor(sessionId)
  if (existing && existing !== roll) return false
  const map = readLocks()
  map[sessionId] = { roll, deviceId: getDeviceId(), at: Date.now() }
  writeLocks(map)
  return true
}

export function clearDeviceLock(sessionId: string) {
  const map = readLocks()
  delete map[sessionId]
  writeLocks(map)
}
