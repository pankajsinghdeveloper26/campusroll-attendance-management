import type React from "react"
import { useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { registerBackHandler } from "@/lib/back-guard"
import { ThemeToggle } from "@/components/theme-toggle"

export function ScreenShell({
  title,
  subtitle,
  onBack,
  headerAccessory,
  children,
  contentClassName = "",
}: {
  title: string
  subtitle?: string
  onBack: () => void
  headerAccessory?: React.ReactNode
  children: React.ReactNode
  contentClassName?: string
}) {
  // Hardware/browser back closes this screen instead of exiting the app.
  useEffect(
    () =>
      registerBackHandler(() => {
        onBack()
        return true
      }),
    [onBack],
  )

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="relative flex min-h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white sm:min-h-[860px] sm:rounded-[2.5rem] sm:border sm:border-slate-200 sm:shadow-xl">
        {/* Header */}
        <header className="flex items-center gap-3 px-6 pt-12 pb-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-bold leading-tight text-slate-900">{title}</h1>
            {subtitle ? <p className="truncate text-sm font-medium text-slate-400">{subtitle}</p> : null}
          </div>
          {headerAccessory ?? <ThemeToggle />}
        </header>

        <div className={`flex-1 overflow-y-auto px-6 pb-10 ${contentClassName}`}>{children}</div>
      </div>
    </main>
  )
}
