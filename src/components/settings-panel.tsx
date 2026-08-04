import type React from "react"
import { useState } from "react"
import {
  MapPin,
  Bell,
  ShieldCheck,
  Database,
  LogOut,
  ChevronRight,
  Trash2,
  Smartphone,
} from "lucide-react"
import { useRoster, countNamed, resetRoster } from "@/lib/roster"
import { AppFooterTag } from "@/components/app-footer-tag"
import { DeveloperProfile } from "@/components/developer-profile"

export function SettingsPanel({ onSignOut }: { onSignOut: () => void }) {
  const roster = useRoster()
  const [geofence, setGeofence] = useState(true)
  const [notifications, setNotifications] = useState(true)

  const named = countNamed(roster)

  return (
    <div>
      <h1 className="text-[26px] font-bold leading-tight text-slate-900">Settings</h1>
      <p className="text-sm font-medium text-slate-400">Manage your class preferences</p>

      {/* Profile */}
      <div className="mt-5 flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_10px_25px_-16px_rgba(15,23,42,0.4)] ring-1 ring-slate-100">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-[18px] font-bold text-white">
          CR
        </span>
        <div>
          <p className="text-[16px] font-bold text-slate-900">Class Representative</p>
          <p className="text-sm text-slate-400">BCA Data Science — Section A</p>
        </div>
      </div>

      {/* Preferences */}
      <h2 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">Preferences</h2>
      <div className="mt-3 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-100">
        <ToggleRow
          icon={<MapPin className="h-5 w-5 text-blue-600" />}
          title="GPS Geofencing"
          desc="Lock check-ins to the classroom"
          on={geofence}
          onToggle={() => setGeofence((v) => !v)}
        />
        <div className="mx-4 h-px bg-slate-100" />
        <ToggleRow
          icon={<Bell className="h-5 w-5 text-blue-600" />}
          title="Notifications"
          desc="Session reminders & alerts"
          on={notifications}
          onToggle={() => setNotifications((v) => !v)}
        />
      </div>

      {/* Data */}
      <h2 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">Data</h2>
      <div className="mt-3 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-100">
        <LinkRow
          icon={<Database className="h-5 w-5 text-slate-500" />}
          title="Roster stored on device"
          desc={`${named} of ${roster.length} names saved locally`}
        />
        <div className="mx-4 h-px bg-slate-100" />
        <LinkRow icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />} title="Privacy" desc="No account · no server" />
        <div className="mx-4 h-px bg-slate-100" />
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm("Clear all roster names from this device?")) {
              resetRoster()
            }
          }}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-slate-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <Trash2 className="h-5 w-5 text-red-500" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-red-500">Clear local data</span>
            <span className="block text-sm text-slate-400">Reset roster to Roll 01–80</span>
          </span>
        </button>
      </div>

      <DeveloperProfile className="mt-6" />

      {/* Sign out */}
      <button
        type="button"
        onClick={onSignOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" />
        Switch role
      </button>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-300">
        <Smartphone className="h-3.5 w-3.5" />
        CampusRoll v1.0.0 · BCA Data Science Dept.
      </p>
      <AppFooterTag className="mt-1.5" />
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">{icon}</span>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  )
}

function LinkRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">{icon}</span>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300" />
    </div>
  )
}
