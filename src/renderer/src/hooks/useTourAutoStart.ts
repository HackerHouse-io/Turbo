import { useEffect } from 'react'
import { useTourStore } from '../stores/useTourStore'

// Cache the completion check across HMR remounts so dev iteration doesn't re-IPC
let cachedCompleted: boolean | null = null

export function useTourAutoStart() {
  useEffect(() => {
    if (cachedCompleted === true) return
    let cancelled = false

    window.api.getSetting('onboardingCompleted').then(completed => {
      cachedCompleted = !!completed
      if (cancelled || completed) return
      // Delay so the underlying layout (TopBar, sidebar) has mounted before
      // the tour overlays it — gives the spotlight target elements time to settle
      setTimeout(() => {
        if (!cancelled) useTourStore.getState().startTour()
      }, 800)
    })

    return () => {
      cancelled = true
    }
  }, [])
}
