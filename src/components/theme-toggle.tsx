import { Moon, Sun } from "lucide-react"
import { useTheme, toggleTheme } from "@/lib/theme"

/**
 * Header icon that flips the app between light and dark. Theme is persisted
 * in localStorage and applied on <html>, so every screen stays in sync.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition-transform active:scale-95 ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
