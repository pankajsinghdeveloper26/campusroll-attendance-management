import { useState, useEffect } from "react"
import { supabase } from "./supabase"

export type AttendanceStatus = "PRESENT" | "ABSENT"

let checkins: Record<string, AttendanceStatus> = {}
let hydrated = false
const listeners = new Set<() => void>()

function hydrate() {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem("campusroll_checkins")
    if (raw) checkins = JSON.parse(raw)
  } catch (e) {
    console.error(e)
  }
  hydrated = true
}

function persist() {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("campusroll_checkins", JSON.stringify(checkins))
  } catch (e) {
    console.error(e)
  }
}

function emit() {
  listeners.forEach((fn) => fn())
}

export function recordCheckin(
  roll: string,
  status: AttendanceStatus = "PRESENT",
  onError?: (message: string) => void,
) {
  if (!hydrated) hydrate()
  checkins = { ...checkins, [roll]: status }
  persist()
  emit()

  supabase
    .from("attendance")
    .insert([
      {
        student_id: roll,
        student_name: roll,
        subject: "General",
        marked_at: new Date().toISOString(),
      },
    ])
    .then(({ error }) => {
      if (error) {
        console.error("Supabase Error:", error.message)
        // The local check-in already succeeded (it's persisted to localStorage above),
        // so this only warns that the record hasn't synced to Supabase yet.
        onError?.(error.message)
      } else {
        console.log(`Roll ${roll} saved to Supabase!`)
      }
    })
}

export function clearCheckins() {
  checkins = {}
  persist()
  emit()
}

export function getCheckins(): Record<string, AttendanceStatus> {
  if (!hydrated) hydrate()
  return checkins
}

export function subscribeCheckins(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// React Custom Hook (Jo live-session-screen.tsx mang raha tha)
export function useCheckins() {
  const [data, setData] = useState<Record<string, AttendanceStatus>>(() => getCheckins())

  useEffect(() => {
    const unsubscribe = subscribeCheckins(() => {
      setData({ ...getCheckins() })
    })
    return () => unsubscribe()
  }, [])

  return data
}