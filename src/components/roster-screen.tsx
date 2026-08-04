import type React from "react"
import { useMemo, useState } from "react"
import { Search, Upload, Check, X, UserRound, RotateCcw } from "lucide-react"
import { useRoster, setStudentName, bulkImportNames, resetRoster, countNamed } from "@/lib/roster"

export function RosterPanel() {
  const roster = useRoster()
  const [query, setQuery] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const named = countNamed(roster)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((s) => s.roll.includes(q) || s.name.toLowerCase().includes(q))
  }, [roster, query])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-slate-900">Student Roster</h1>
          <p className="text-sm font-medium text-slate-400">
            {named} of {roster.length} names added
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex h-11 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.7)] transition-transform active:scale-95"
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roll number or name"
          className="w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        ) : null}
      </div>

      {/* List */}
      <ul className="mt-4 flex flex-col gap-2.5">
        {filtered.map((s) => (
          <RosterRow key={s.roll} roll={s.roll} name={s.name} />
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-100">
            No students match “{query}”.
          </li>
        ) : null}
      </ul>

      {/* Reset */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.confirm("Clear all names and reset the roster?")) {
            resetRoster()
          }
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-red-500 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
      >
        <RotateCcw className="h-4 w-4" />
        Reset roster
      </button>

      {importOpen ? <ImportSheet onClose={() => setImportOpen(false)} /> : null}
    </div>
  )
}

function RosterRow({ roll, name }: { roll: string; name: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  function save() {
    setStudentName(roll, draft.trim())
    setEditing(false)
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_6px_16px_-14px_rgba(15,23,42,0.4)] ring-1 ring-slate-100">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
        {roll}
      </span>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === "Enter") save()
            if (e.key === "Escape") {
              setDraft(name)
              setEditing(false)
            }
          }}
          placeholder={`Name for Roll ${roll}`}
          className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-[15px] text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(name)
            setEditing(true)
          }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {name ? (
            <span className="truncate text-[15px] font-semibold text-slate-800">{name}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[15px] text-slate-400">
              <UserRound className="h-4 w-4" />
              Tap to add name
            </span>
          )}
        </button>
      )}

      {editing ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={save}
            aria-label="Save name"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform active:scale-90"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(name)
              setEditing(false)
            }}
            aria-label="Cancel"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </li>
  )
}

function ImportSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("")

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm">
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        <h2 className="text-[19px] font-bold text-slate-900">Bulk import names</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Paste one name per line in roll order (Roll 01 first), or use{" "}
          <span className="font-semibold text-slate-700">01, Name</span> lines to target specific rolls.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={"Aarav Sharma\nDiya Verma\nRohan Gupta\n...\n\nor\n\n05, Kabir Singh\n12, Ananya Rao"}
          className="mt-4 w-full resize-none rounded-2xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-[15px] font-semibold text-slate-600 transition-transform active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              bulkImportNames(text)
              onClose()
            }}
            disabled={text.trim().length === 0}
            className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            Import names
          </button>
        </div>
      </div>
    </div>
  )
}
