import { useState } from "react"
import {
  GraduationCap,
  MapPin,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Radar,
  Lock,
  Zap,
  ShieldHalf,
} from "lucide-react"
import { CrDashboard } from "@/components/cr-dashboard"
import { StudentCheckinScreen } from "@/components/student-checkin-screen"
import { AppFooterTag } from "@/components/app-footer-tag"

type CurrentView = "splash" | "cr" | "student"

export function CampusRollSplash() {
  const [currentView, setCurrentView] = useState<CurrentView>("splash")

  if (currentView === "cr") {
    return <CrDashboard onBack={() => setCurrentView("splash")} />
  }

  if (currentView === "student") {
    return <StudentCheckinScreen onBack={() => setCurrentView("splash")} />
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      {/* Phone frame */}
      <div className="flex min-h-dvh w-full max-w-[420px] flex-col bg-gradient-to-b from-slate-50 to-white px-6 pb-8 pt-14 sm:min-h-[860px] sm:rounded-[2.5rem] sm:border sm:border-slate-200 sm:shadow-xl">
        {/* Logo */}
        <div className="mt-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.35)]">
            <GraduationCap className="h-11 w-11 text-blue-600" strokeWidth={2.2} />
          </div>
        </div>

        {/* Location badge */}
        <div className="mt-7 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            <MapPin className="h-4 w-4" />
            J.C. Bose UST · Faridabad
          </span>
        </div>

        {/* Title */}
        <div className="mt-5 text-center">
          <h1 className="text-balance text-[28px] font-bold leading-tight text-slate-900">
            YMCA BCA Data Science
            <br />
            <span className="text-blue-600">CampusRoll</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[300px] text-pretty text-[15px] leading-relaxed text-slate-400">
            Offline, secure &amp; serverless attendance tracker for classes.
          </p>
        </div>

        {/* Feature pills */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <FeaturePill icon={<Radar className="h-3.5 w-3.5" />} label="Offline-first" />
          <FeaturePill icon={<Lock className="h-3.5 w-3.5" />} label="Secure" />
          <FeaturePill icon={<Zap className="h-3.5 w-3.5" />} label="No server" />
        </div>

        {/* Divider */}
        <hr className="mt-7 border-slate-200" />

        {/* Role selection */}
        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Select your role to continue
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {/* CR card */}
          <button
            type="button"
            onClick={() => setCurrentView("cr")}
            className="group flex items-center gap-4 rounded-3xl bg-blue-600 p-5 text-left shadow-[0_14px_30px_-10px_rgba(37,99,235,0.6)] transition-transform active:scale-[0.98]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <ShieldCheck className="h-6 w-6 text-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold leading-snug text-white">
                I am a Class Representative (CR)
              </span>
              <span className="mt-0.5 block text-sm text-blue-100">Mark &amp; manage class attendance</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
          </button>

          {/* Student card */}
          <button
            type="button"
            onClick={() => setCurrentView("student")}
            className="group flex items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-[0_10px_25px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-100 transition-transform active:scale-[0.98]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Smartphone className="h-6 w-6 text-slate-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold leading-snug text-slate-900">I am a Student</span>
              <span className="mt-0.5 block text-sm text-slate-400">View your attendance records</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400">
            <ShieldHalf className="h-4 w-4" />
            All data stays on your device. No account needed.
          </p>
          <p className="mt-1.5 text-xs text-slate-300">v1.0.0 · BCA Data Science Dept.</p>
          <AppFooterTag className="mt-1.5" />
        </div>
      </div>
    </main>
  )
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
      {icon}
      {label}
    </span>
  )
}
