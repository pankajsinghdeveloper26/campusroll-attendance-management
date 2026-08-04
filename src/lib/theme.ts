import { useSyncExternalStore } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "campusroll_theme"

let theme: Theme = "light"
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function applyToDocument() {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === "dark" || saved === "light") {
      theme = saved
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      theme = "dark"
    }
  } catch {
    // storage unavailable — fall back to light
  }
  applyToDocument()
}

function subscribe(cb: () => void) {
  if (!hydrated) {
    hydrate()
    emit()
  }
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      hydrated = false
      hydrate()
      emit()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}

const getSnapshot = () => theme
const getServerSnapshot = (): Theme => "light"

export function setTheme(next: Theme) {
  theme = next
  hydrated = true
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore
  }
  applyToDocument()
  emit()
}

export function toggleTheme() {
  setTheme(theme === "dark" ? "light" : "dark")
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
