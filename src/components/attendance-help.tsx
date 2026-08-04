import { useEffect, useRef, useState } from "react"
import { Bot, X, Send, Sparkles } from "lucide-react"

/**
 * Lightweight offline FAQ assistant. Answers are matched on keywords so the
 * helper keeps working with no network and no server, like the rest of the app.
 */
type Msg = { id: string; role: "bot" | "user"; text: string }

type Faq = { keys: string[]; answer: string }

const FAQS: Faq[] = [
  {
    keys: ["check in", "checkin", "check-in", "mark present", "cannot check", "not working", "fail"],
    answer:
      "To check in: open CampusRoll → “I am a Student” → scan the CR's QR code with your camera → allow location. Check-ins need three things: a QR token less than 15 seconds old, GPS inside the classroom radius (30–50 m), and a device that hasn't already checked in another roll number for this session.",
  },
  {
    keys: ["qr", "scan", "camera", "expired", "token"],
    answer:
      "The session QR rotates every 8 seconds and expires after 15, so screenshots can't be reused. If scanning fails, tap the camera view to retry, allow camera permission, or type the 6-character session code shown under the QR.",
  },
  {
    keys: ["gps", "location", "radius", "geofence", "distance"],
    answer:
      "GPS geofencing compares your location with the CR's session coordinates. You must be within the session radius (default 40 m). Move inside the classroom, stand near a window for a better fix, and make sure location permission is set to “Allow”.",
  },
  {
    keys: ["device", "phone", "another student", "proxy", "friend"],
    answer:
      "Each phone is bound to one roll number per session (device lock). You can't mark a friend present from your phone — they must scan on their own device, or ask the CR to mark them manually before locking attendance.",
  },
  {
    keys: ["75", "criteria", "percentage", "eligible", "detain", "shortage"],
    answer:
      "The 75% rule: you must attend at least 75% of the classes held. Divide your present + late classes by total classes held. Below 75% you're in shortage — check the Analytics card on the CR dashboard or the History tab for current numbers.",
  },
  {
    keys: ["export", "pdf", "csv", "excel", "xlsx", "download", "save", "share"],
    answer:
      "Go to Export Sheet on the CR dashboard, pick CSV, Excel or PDF, then tap Export. On Android/iOS the share sheet opens so you can save the file to device storage, Drive or WhatsApp. On desktop the file downloads straight away.",
  },
  {
    keys: ["late", "status", "absent", "edit", "override"],
    answer:
      "The CR can change any status (Present / Late / Absent) in the live session screen before tapping Finalize & Lock. After locking, the session is stored in History and can be exported.",
  },
  {
    keys: ["data", "privacy", "server", "account", "login"],
    answer:
      "CampusRoll is offline-first: roster, notes and attendance history live in your browser's local storage on this device. No account, no server, nothing uploaded.",
  },
  {
    keys: ["developer", "contact", "pankaj", "support", "help"],
    answer:
      "CampusRoll is developed by Pankaj Singh. Contact: pankajsinghdeveloper26@gmail.com, or LinkedIn at linkedin.com/in/pankaj-singh-053a2a364.",
  },
]

const SUGGESTIONS = [
  "My check-in fails",
  "What is the 75% rule?",
  "How do I export to Excel?",
  "QR code expired",
]

function answerFor(question: string): string {
  const q = question.toLowerCase()
  let best: { faq: Faq; score: number } | null = null
  for (const faq of FAQS) {
    let score = 0
    for (const k of faq.keys) if (q.includes(k)) score += k.length
    if (score > 0 && (!best || score > best.score)) best = { faq, score }
  }
  if (best) return best.faq.answer
  return "I can help with check-in problems, QR scanning, GPS geofencing, the device lock, the 75% attendance rule, and exporting CSV/Excel/PDF reports. Try asking about one of those."
}

let seq = 0
function nextId() {
  seq += 1
  return `m${seq}`
}

export function AttendanceHelp() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      role: "bot",
      text: "Hi! I'm the CampusRoll assistant. Ask me about check-in issues, attendance criteria, or exports.",
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, open])

  function ask(text: string) {
    const clean = text.trim()
    if (!clean) return
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: clean },
      { id: nextId(), role: "bot", text: answerFor(clean) },
    ])
    setDraft("")
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close CampusRoll assistant" : "Open CampusRoll assistant"}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_16px_34px_-10px_rgba(37,99,235,0.8)] transition-transform active:scale-95 sm:bottom-8 sm:right-8"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="CampusRoll assistant"
          className="fixed bottom-40 right-4 z-40 flex max-h-[70dvh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,0.55)] ring-1 ring-slate-200 sm:bottom-28 sm:right-8"
        >
          <header className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-slate-900">CampusRoll Assistant</p>
              <p className="text-xs text-slate-400">Offline help · check-in, rules, exports</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    m.role === "user"
                      ? "self-end bg-blue-600 font-medium text-white"
                      : "self-start bg-slate-100 text-slate-700"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-transform active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-3">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(draft)
              }}
              placeholder="Ask about check-in, 75% rule, exports…"
              aria-label="Ask the assistant"
              className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => ask(draft)}
              aria-label="Send question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
