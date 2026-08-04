import { useEffect, useState } from "react"
import { Copy, RefreshCw, ShieldCheck, MapPin, Loader2, Timer, Radar } from "lucide-react"
import { ScreenShell } from "@/components/screen-shell"
import { QrCode } from "@/components/qr-code"
import { AppFooterTag } from "@/components/app-footer-tag"
import { readCurrentPosition, GeoError } from "@/lib/geo"
import {
  buildSessionToken,
  startLiveSession,
  endLiveSession,
  useLiveSession,
  TOKEN_ROTATE_MS,
  TOKEN_MAX_AGE_MS,
} from "@/lib/live-session"

const RADIUS_OPTIONS = [30, 40, 50]

export function QrCheckinScreen({ onBack }: { onBack: () => void }) {
  const session = useLiveSession()
  const [radius, setRadius] = useState(40)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Drives the rotating QR token.
  useEffect(() => {
    if (!session) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [session])

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const origin = await readCurrentPosition()
      startLiveSession(origin, radius)
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof GeoError ? err.message : "Couldn't start the session. Try again.")
    } finally {
      setStarting(false)
    }
  }

  function copyCode() {
    if (!session) return
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(session.id).catch(() => {})
    }
  }

  if (!session) {
    return (
      <ScreenShell title="QR Check-in" subtitle="Start a secure scan session" onBack={onBack}>
        <div className="rounded-3xl bg-white p-6 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.5)] ring-1 ring-slate-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Radar className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-[18px] font-bold text-slate-900">Anchor the session to your classroom</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            We read your current GPS position once and use it as the classroom centre. Students can only mark
            themselves present from inside this radius, with a QR token that refreshes every{" "}
            {Math.round(TOKEN_ROTATE_MS / 1000)} seconds.
          </p>

          <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">Allowed radius</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`rounded-2xl py-3 text-[15px] font-bold transition-transform active:scale-[0.98] ${
                  radius === r ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {r} m
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 text-sm font-semibold text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={start}
            disabled={starting}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full bg-emerald-500 px-6 py-4 text-[16px] font-bold text-white shadow-[0_16px_34px_-10px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            {starting ? "Reading location…" : "Start secure QR session"}
          </button>
        </div>
        <AppFooterTag className="mt-6" />
      </ScreenShell>
    )
  }

  const token = buildSessionToken(session, now)
  const secondsLeft = Math.max(
    0,
    Math.ceil((Math.floor(now / TOKEN_ROTATE_MS) * TOKEN_ROTATE_MS + TOKEN_ROTATE_MS - now) / 1000),
  )

  return (
    <ScreenShell title="QR Check-in" subtitle="Students scan to mark attendance" onBack={onBack}>
      <div className="flex flex-col items-center rounded-3xl bg-white p-6 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.5)] ring-1 ring-slate-100">
        <QrCode value={token} size={232} />

        <p className="mt-4 text-sm font-medium text-slate-400">Session code</p>
        <p className="font-mono text-[30px] font-bold tracking-[0.2em] text-slate-900">{session.id}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-600">
          <ShieldCheck className="h-4 w-4" />
          Rotating token · expires in {Math.round(TOKEN_MAX_AGE_MS / 1000)}s
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
          <Timer className="h-4 w-4" />
          Refreshes in {secondsLeft}s
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-800">Geofence active · {session.radiusM} m</span>
          <span className="block truncate text-xs text-slate-400">
            {session.origin.lat.toFixed(5)}, {session.origin.lng.toFixed(5)}
          </span>
        </span>
        <button
          type="button"
          onClick={copyCode}
          aria-label="Copy session code"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            endLiveSession()
            startLiveSession(session.origin, session.radiusM)
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-[15px] font-semibold text-white shadow-[0_12px_26px_-12px_rgba(37,99,235,0.7)] transition-transform active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" />
          New code
        </button>
        <button
          type="button"
          onClick={() => {
            endLiveSession()
            onBack()
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-[15px] font-semibold text-slate-700 ring-1 ring-slate-200 transition-transform active:scale-[0.98]"
        >
          End session
        </button>
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-slate-400">
        Ask students to open CampusRoll, tap “I am a Student”, then scan this live code from inside the classroom.
      </p>
      <AppFooterTag className="mt-6" />
    </ScreenShell>
  )
}
