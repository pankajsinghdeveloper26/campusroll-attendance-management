import { useEffect, useState } from "react"
import { StickyNote, Plus, Trash2, Check } from "lucide-react"

/** Persistent quick notes / reminders for the CR, stored on device. */
type Note = { id: string; text: string; done: boolean; at: number }

const STORAGE_KEY = "campusroll.notes.v1"

function readNotes(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Note[]) : []
  } catch {
    return []
  }
}

export function CrStickyNotes({ className = "" }: { className?: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState("")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setNotes(readNotes())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    } catch {
      // storage unavailable — keep in memory
    }
  }, [notes, hydrated])

  function add() {
    const text = draft.trim()
    if (!text) return
    setNotes((prev) => [
      { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text, done: false, at: Date.now() },
      ...prev,
    ])
    setDraft("")
  }

  return (
    <section className={`rounded-3xl bg-white p-5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.4)] ring-1 ring-slate-100 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
          <StickyNote className="h-5 w-5 text-amber-500" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-tight text-slate-900">Quick Notes</h2>
          <p className="text-sm text-slate-400">Announcements &amp; reminders for the class</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add()
          }}
          placeholder="e.g. Lab submission due Friday"
          aria-label="New quick note"
          className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add note"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_22px_-12px_rgba(37,99,235,0.8)] transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No notes yet — jot down anything you need to remember.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-center gap-3 rounded-2xl bg-amber-50/70 px-3.5 py-3 ring-1 ring-amber-100"
            >
              <button
                type="button"
                aria-label={n.done ? "Mark as pending" : "Mark as done"}
                onClick={() =>
                  setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))
                }
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                  n.done ? "bg-emerald-500 text-white" : "bg-white text-slate-300 ring-1 ring-amber-200"
                }`}
              >
                <Check className="h-4 w-4" />
              </button>
              <span
                className={`min-w-0 flex-1 text-[15px] font-medium ${
                  n.done ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {n.text}
              </span>
              <button
                type="button"
                aria-label="Delete note"
                onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-transform active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
