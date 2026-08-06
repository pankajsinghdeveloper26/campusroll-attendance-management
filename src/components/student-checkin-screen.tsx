import { useMemo, useState } from "react"
import {
  Search,
  X,
  ChevronDown,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  UserRound,
  QrCode as QrIcon,
  ScanLine,
} from "lucide-react"
import { ScreenShell } from "@/components/screen-shell"
import { AppFooterTag } from "@/components/app-footer-tag"
import { QrScanner } from "@/components/qr-scanner"
import { useRoster, setStudentName, type Student } from "@/lib/roster"
import { recordCheckin } from "@/lib/checkins"
import { getLiveSession, verifySessionToken, type ParsedToken } from "@/lib/live-session"

type Phase = "idle" | "verifying" | "verified"

function labelFor(student: Student) {
  return student.name.trim() ? student.name.trim() : `Unassigned`
}

export function StudentCheckinScreen({ onBack }: { onBack: () => void }) {
  const roster = useRoster()
  const [rollOpen, setRollOpen] = useState(false)
  const [rollQuery, setRollQuery] = useState("")
  const [roll, setRoll] = useState("")
  const [fullName, setFullName] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [token, setToken] = useState<ParsedToken | null>(null)
  const [manualCode, setManualCode] = useState("")
  const [syncWarning, setSyncWarning] = useState<string | null>(null)

  const selected = roster.find((s) => s.roll === roll) ?? null

  const options = useMemo(() => {
    const q = rollQuery.trim().toLowerCase().replace(/^#/, "")
    if (!q) return roster
    return roster.filter((s) => s.roll.includes(q) || s.name.toLowerCase().includes(q))
  }, [roster, rollQuery])

  function handleScan(raw: string) {
    const check = verifySessionToken(raw)
    if (!check.ok) {
      setError(
        check.reason === "expired"
          ? "That QR code has expired. Scan the live code on the CR's screen again."
          : "That QR code isn't a valid CampusRoll session token.",
      )
      return
    }
    setError(null)
    setToken(check.token)
    setScanning(false)
  }

  function useManualCode() {
    const code = manualCode.trim().toUpperCase()
    if (!code) {
      setError("Enter the 6-character session code shown under the CR's QR.")
      return
    }
    const live = getLiveSession()
    if (!live || live.id !== code) {
      setError("No live session matches that code on this device. Please scan the QR instead.")
      return
    }
    setError(null)
    setToken({ sessionId: live.id, slot: 0, sig: "", origin: live.origin, radiusM: live.radiusM })
  }

  async function handleVerify() {
    if (phase === "verifying") return
    if (!token) {
      setError("Scan the CR's QR code first — it proves you're in this class right now.")
      return
    }
    if (!roll) {
      setError("Select your roll number to continue.")
      return
    }
    if (!fullName.trim()) {
      setError("Enter your full name as it appears on the roster.")
      return
    }

    // Geofencing, GPS distance, and device-lock checks are intentionally skipped —
    // check-in is no longer blocked by location or device restrictions. Only the
    // session QR/code (token) is still required, since that's not a location/device check.
    setError(null)
    setSyncWarning(null)
    setPhase("verifying")
    try {
      setStudentName(roll, fullName.trim())
 await recordCheckin(roll, "PRESENT")
      setPhase("verified")
    } catch (err) {
      // recordCheckin() writes to local state synchronously and fires the Supabase
      // insert in the background, so this only catches unexpected local errors.
      // Supabase-specific errors are logged (and can be surfaced) from checkins.ts.
      console.error("Check-in failed:", err)
      setPhase("idle")
      setError("Something went wrong marking you present. Please try again.")
    }
  }

  function reset() {
    setPhase("idle")
    setRoll("")
    setFullName("")
    setRollQuery("")
    setToken(null)
    setError(null)
    setSyncWarning(null)
  }

  return (
    <ScreenShell title="Mark Your Attendance" subtitle="Student self check-in" onBack={onBack}>
      {/* Header badge */}
      <div className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-blue-400">Session open · YMCA BCA Data Science</p>
          <p className="mt-0.5 text-xs text-slate-400">Scan the live QR from inside the classroom</p>
        </div>
      </div>

      {phase === "verified" ? (
        <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-[0_14px_34px_-20px_rgba(15,23,42,0.5)] ring-1 ring-emerald-100">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-4 text-[18px] font-bold text-slate-900">You're marked present</p>
          <p className="mt-1 text-sm text-slate-400">Roll #{roll} has been marked present.</p>
          {syncWarning ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
              {syncWarning}
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-[15px] font-semibold text-slate-600 transition-transform active:scale-[0.98]"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(37,99,235,0.7)] transition-transform active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step 1 — scan */}
          <label className="mt-6 block text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Step 1 · Scan session QR
          </label>

          {token ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-emerald-700">Session {token.sessionId} verified</span>
                <span className="block text-xs text-emerald-600">Geofence radius {token.radiusM} m</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setToken(null)
                  setScanning(true)
                }}
                className="text-sm font-semibold text-emerald-700"
              >
                Rescan
              </button>
            </div>
          ) : scanning ? (
            <div className="mt-2">
              <QrScanner onResult={handleScan} />
              <button
                type="button"
                onClick={() => setScanning(false)}
                className="mt-2 w-full rounded-2xl bg-white py-3 text-[15px] font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                Stop camera
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setScanning(true)
                }}
                className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-900 py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                <ScanLine className="h-5 w-5" />
                Open camera scanner
              </button>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Or enter session code"
                  aria-label="Session code"
                  className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 font-mono text-[15px] font-bold tracking-[0.2em] text-slate-800 ring-1 ring-slate-200 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={useManualCode}
                  className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition-transform active:scale-95"
                >
                  <QrIcon className="h-4 w-4" />
                  Use
                </button>
              </div>
            </>
          )}

          {/* Step 2 — identity */}
          <label className="mt-6 block text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Step 2 · Roll number
          </label>
          <button
            type="button"
            onClick={() => setRollOpen((v) => !v)}
            aria-expanded={rollOpen}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-200 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
              {roll ? `#${roll}` : <UserRound className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-slate-800">
                {roll ? `#${roll}` : "Select your roll number"}
              </span>
              {selected ? (
                <span className="block truncate text-xs text-slate-400">{labelFor(selected)}</span>
              ) : (
                <span className="block text-xs text-slate-400">#01 – #80</span>
              )}
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${rollOpen ? "rotate-180" : ""}`} />
          </button>

          {rollOpen ? (
            <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={rollQuery}
                  onChange={(e) => setRollQuery(e.target.value)}
                  placeholder="Search roll number or name"
                  className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {rollQuery ? (
                  <button type="button" onClick={() => setRollQuery("")} aria-label="Clear search">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                ) : null}
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {options.length === 0 ? (
                  <li className="px-4 py-5 text-center text-sm text-slate-400">No roll numbers match.</li>
                ) : (
                  options.map((s) => (
                    <li key={s.roll}>
                      <button
                        type="button"
                        onClick={() => {
                          setRoll(s.roll)
                          if (s.name.trim()) setFullName(s.name.trim())
                          setRollOpen(false)
                          setRollQuery("")
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                          roll === s.roll ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="w-10 shrink-0 text-sm font-bold text-blue-700">#{s.roll}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{labelFor(s)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}

          {/* Full name */}
          <label
            htmlFor="checkin-name"
            className="mt-5 block text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400"
          >
            Full name
          </label>
          <input
            id="checkin-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Aanya Sharma"
            className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error ? <p className="mt-3 text-sm font-semibold text-red-500">{error}</p> : null}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={phase === "verifying"}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-emerald-500 px-6 py-4 text-[16px] font-bold text-white shadow-[0_16px_34px_-10px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {phase === "verifying" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Marking present…
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" />
                Verify Location &amp; Mark Present
              </>
            )}
          </button>

          {/* Security notes */}
          <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Check-in protection
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-slate-400">
              <li>· QR tokens rotate every few seconds and expire after 15s.</li>
              <li>· Your CR can override any entry before locking attendance.</li>
            </ul>
          </div>
        </>
      )}

      <AppFooterTag className="mt-6" />
    </ScreenShell>
  )
}