import { create } from 'zustand'
import { isVersionNewer } from '../../../shared/utils'
import { DISMISSED_CLAUDE_VERSION_KEY } from '../../../shared/constants'
import { useTourStore } from './useTourStore'

// Resolver and in-flight Promise live outside Zustand state so they
// don't trigger subscriber re-renders and can hold non-serializable values.
let pendingResolver: ((proceed: boolean) => void) | null = null
let inflightCheck: Promise<void> | null = null

function loadDismissedVersion(): string | null {
  try { return localStorage.getItem(DISMISSED_CLAUDE_VERSION_KEY) } catch { return null }
}

function saveDismissedVersion(version: string): void {
  try { localStorage.setItem(DISMISSED_CLAUDE_VERSION_KEY, version) } catch { /* noop */ }
}

interface UpdateState {
  currentVersion: string | null
  latestVersion: string | null
  modalOpen: boolean
  dismissedVersion: string | null

  checkForUpdates: () => Promise<void>
  requireUpdateCheckBeforeSend: () => Promise<boolean>
  dismiss: () => void
  acceptUpdate: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: null,
  latestVersion: null,
  modalOpen: false,
  dismissedVersion: loadDismissedVersion(),

  checkForUpdates: async () => {
    if (inflightCheck) return inflightCheck

    inflightCheck = (async () => {
      try {
        const result = await window.api.checkClaudeUpdates()
        const currentVersion = result.currentVersion ?? null
        const latestVersion = result.latestVersion ?? null

        // Only show the modal if an update exists, the user hasn't already
        // dismissed this (or a newer) version, and the onboarding tour
        // isn't currently showing — don't stack modals.
        const dismissed = get().dismissedVersion
        const tourOpen = useTourStore.getState().tourOpen
        const shouldOpen =
          result.updateAvailable &&
          !!latestVersion &&
          !tourOpen &&
          (!dismissed || isVersionNewer(latestVersion, dismissed))

        const prev = get()
        const versionsChanged =
          prev.currentVersion !== currentVersion || prev.latestVersion !== latestVersion
        const needsOpen = shouldOpen && !prev.modalOpen
        if (!versionsChanged && !needsOpen) return

        set({
          currentVersion,
          latestVersion,
          ...(needsOpen ? { modalOpen: true } : {})
        })
      } catch {
        // Silent failure — the modal is purely additive.
      }
    })()

    try {
      await inflightCheck
    } finally {
      inflightCheck = null
    }
  },

  requireUpdateCheckBeforeSend: async (): Promise<boolean> => {
    await get().checkForUpdates()
    if (!get().modalOpen) return true

    // A previous send is already waiting on the same modal — release it
    // first so we don't leak the resolver. The previous send returns
    // false (cancelled), since the new send supersedes it.
    if (pendingResolver) {
      const prev = pendingResolver
      pendingResolver = null
      prev(false)
    }

    return new Promise<boolean>(resolve => {
      pendingResolver = resolve
    })
  },

  dismiss: () => {
    const latest = get().latestVersion
    if (latest) saveDismissedVersion(latest)
    set({
      modalOpen: false,
      ...(latest ? { dismissedVersion: latest } : {})
    })
    if (pendingResolver) {
      const r = pendingResolver
      pendingResolver = null
      r(true)
    }
  },

  acceptUpdate: () => {
    // Treat "Update Now" as acknowledgment of this version so we don't
    // re-prompt while `claude update` is still running in the background
    // (the npm cache TTL is 1 hour, so the next send would otherwise
    // reopen the modal before the update finishes).
    const latest = get().latestVersion
    if (latest) saveDismissedVersion(latest)
    set({
      modalOpen: false,
      ...(latest ? { dismissedVersion: latest } : {})
    })
    if (pendingResolver) {
      const r = pendingResolver
      pendingResolver = null
      r(false)
    }
  }
}))
