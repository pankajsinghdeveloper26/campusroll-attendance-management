import { useSyncExternalStore } from "react"
import type { Coords } from "@/lib/geo"

/**
 * Live session store for the anti-cheat check-in flow.
 *
 * A session holds the CR's classroom coordinates, an allowed radius and a
 * rotating secret. Students scan a QR token that expires after 15 seconds,
 * so a screenshot forwarded to a friend outside class is useless.
 */
export type LiveSession = {
  id: string
  secret: string
  startedAt: number
  origin: Coords
  radiusM: number
}

const STORAGE_KEY = "campusroll.livesession.v1"

/** QR token rotates on this cadence; older-than-MAX tokens are rejected. */
export const TOKEN_ROTATE_MS = 8000
export const TOKEN_MAX_AGE_MS = 15000

let session: LiveSession | null = null
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window === "undefined") return
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // in-memory only
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as LiveSession
    if (parsed && typeof parsed.id === "string" && parsed.origin) session = parsed
  } catch {
    session = null
  }
}

function randomId(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function startLiveSession(origin: Coords, radiusM = 40): LiveSession {
  hydrate()
  session = { id: randomId(6), secret: randomId(16), startedAt: Date.now(), origin, radiusM }
  persist()
  emit()
  return session
}

export function endLiveSession() {
  hydrate()
  session = null
  persist()
  emit()
}

export function getLiveSession(): LiveSession | null {
  hydrate()
  return session
}

export function useLiveSession(): LiveSession | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => {
      hydrate()
      return session
    },
    () => null,
  )
}

/* ------------------------------- tokens -------------------------------- */

function hash(input: string): string {
  // Small non-cryptographic digest — enough to make tokens unguessable offline.
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = (h1 ^ c) * 16777619
    h2 = (h2 + c * 31 + (h2 << 5)) >>> 0
    h1 >>>= 0
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}

/** Encodes the QR payload for the current rotation slot. */
export function buildSessionToken(s: LiveSession, now = Date.now()): string {
  const slot = Math.floor(now / TOKEN_ROTATE_MS)
  const sig = hash(`${s.id}:${s.secret}:${slot}`)
  return [
    "CR1",
    s.id,
    String(slot),
    sig,
    s.origin.lat.toFixed(6),
    s.origin.lng.toFixed(6),
    String(s.radiusM),
  ].join("|")
}

export type ParsedToken = {
  sessionId: string
  slot: number
  origin: Coords
  radiusM: number
  sig: string
}

export function parseSessionToken(raw: string): ParsedToken | null {
  const parts = raw.trim().split("|")
  if (parts.length !== 7 || parts[0] !== "CR1") return null
  const sessionId = parts[1] ?? ""
  const slot = Number(parts[2])
  const sig = parts[3] ?? ""
  const latN = Number(parts[4])
  const lngN = Number(parts[5])
  const radiusN = Number(parts[6])
  if (!sessionId || !sig) return null
  if (!Number.isFinite(slot) || !Number.isFinite(latN) || !Number.isFinite(lngN)) return null
  return {
    sessionId,
    slot,
    sig,
    origin: { lat: latN, lng: lngN },
    radiusM: Number.isFinite(radiusN) && radiusN > 0 ? radiusN : 40,
  }
}

export type TokenCheck =
  | { ok: true; token: ParsedToken }
  | { ok: false; reason: "invalid" | "expired" | "unknown-session" }

/**
 * Validates a scanned token against the session stored on this device.
 * When the device has no session copy we still accept a fresh, well-formed
 * token (offline students who only scanned the CR's screen).
 */
export function verifySessionToken(raw: string, now = Date.now()): TokenCheck {
  const token = parseSessionToken(raw)
  if (!token) return { ok: false, reason: "invalid" }

  const age = now - token.slot * TOKEN_ROTATE_MS
  if (age > TOKEN_MAX_AGE_MS || age < -TOKEN_ROTATE_MS) return { ok: false, reason: "expired" }

  const local = getLiveSession()
  if (local && local.id === token.sessionId) {
    const expected = hash(`${local.id}:${local.secret}:${token.slot}`)
    if (expected !== token.sig) return { ok: false, reason: "invalid" }
  }
  return { ok: true, token }
}
