/**
 * Android / browser back-button guard.
 *
 * Installed once at the root. It keeps a sentinel history entry in place so the
 * hardware back button navigates *inside* the app (or hands control to the
 * in-app screen stack) instead of closing the installed PWA. Screens can opt in
 * by registering a handler; when no handler wants the event and the router has
 * history, we fall back to `router.history.back()`.
 */
export const APP_BACK_EVENT = "campusroll:back"

type BackHandler = () => boolean

const handlers: BackHandler[] = []

/** Register an in-app back handler. Return true if the event was consumed. */
export function registerBackHandler(handler: BackHandler) {
  handlers.push(handler)
  return () => {
    const i = handlers.indexOf(handler)
    if (i >= 0) handlers.splice(i, 1)
  }
}

/** Runs the most recently registered handler that consumes the event. */
export function runBackHandlers() {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    if (handlers[i]!()) return true
  }
  return false
}

export function installBackGuard(routerBack: () => void = () => {}) {
  if (typeof window === "undefined") return () => {}

  // Sentinel entry: gives the first back press something to pop.
  if (!window.history.state || !(window.history.state as { __crGuard?: boolean }).__crGuard) {
    window.history.pushState({ ...(window.history.state ?? {}), __crGuard: true }, "")
  }

  function onPopState() {
    const consumed = runBackHandlers()
    if (consumed) {
      // Keep a sentinel so the next press is also caught instead of exiting.
      window.history.pushState({ __crGuard: true }, "")
      return
    }
    // Nothing in-app to close — we are on the main home screen. Stay put and
    // re-arm the sentinel instead of letting the installed PWA close.
    void routerBack
    window.history.pushState({ __crGuard: true }, "")
  }

  window.addEventListener("popstate", onPopState)
  return () => window.removeEventListener("popstate", onPopState)
}
