import { useSyncExternalStore } from 'react'

// ─── Shared 1-second ticker ────────────────────────────────────
// A single setInterval(1000) replaces N independent intervals
// across AgentCard and SessionRow instances, eliminating the
// "thundering herd" of cascading re-renders.

let now = Date.now()
let listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null

function startInterval() {
  if (intervalId) return
  intervalId = setInterval(() => {
    now = Date.now()
    listeners.forEach(l => l())
  }, 1000)
}

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) startInterval()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopInterval()
  }
}

function getSnapshot(): number {
  return now
}

/** Returns a shared `Date.now()` value updated every 1 second. */
export function useSharedTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
