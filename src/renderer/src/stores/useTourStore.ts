import { create } from 'zustand'
import { TOUR_STEPS } from '../components/onboarding/tourSteps'

const SETTING_KEY = 'onboardingCompleted'

export type ClaudeStatusState = 'idle' | 'checking' | 'installed' | 'missing'

export interface ClaudeStatus {
  state: ClaudeStatusState
  version?: string
}

interface TourState {
  tourOpen: boolean
  currentStep: number
  claudeStatus: ClaudeStatus

  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  restartTour: () => void
  checkClaude: () => Promise<void>
  recheckClaude: () => Promise<void>
}

async function runCheck(force: boolean): Promise<ClaudeStatus> {
  try {
    const result = force
      ? await window.api.recheckClaudeInstalled()
      : await window.api.checkClaudeInstalled()
    return {
      state: result.installed ? 'installed' : 'missing',
      version: result.version
    }
  } catch {
    // IPC failure → treat as missing so the user gets the install card
    // rather than a stuck spinner
    return { state: 'missing' }
  }
}

function statusEquals(a: ClaudeStatus, b: ClaudeStatus): boolean {
  return a.state === b.state && a.version === b.version
}

export const useTourStore = create<TourState>((set, get) => ({
  tourOpen: false,
  currentStep: 0,
  claudeStatus: { state: 'idle' },

  startTour: () => {
    set({ tourOpen: true, currentStep: 0 })
    void get().checkClaude()
  },

  nextStep: () => {
    const { currentStep } = get()
    if (currentStep < TOUR_STEPS.length - 1) {
      set({ currentStep: currentStep + 1 })
    } else {
      get().endTour()
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) set({ currentStep: currentStep - 1 })
  },

  endTour: () => {
    set({ tourOpen: false, currentStep: 0 })
    window.api.setSetting(SETTING_KEY, true)
  },

  restartTour: () => {
    window.api.setSetting(SETTING_KEY, false)
    set({ tourOpen: true, currentStep: 0, claudeStatus: { state: 'idle' } })
    void get().checkClaude()
  },

  checkClaude: async () => {
    if (get().claudeStatus.state === 'checking') return
    set({ claudeStatus: { state: 'checking' } })
    const next = await runCheck(false)
    if (!statusEquals(get().claudeStatus, next)) set({ claudeStatus: next })
  },

  recheckClaude: async () => {
    set({ claudeStatus: { state: 'checking' } })
    const next = await runCheck(true)
    if (!statusEquals(get().claudeStatus, next)) set({ claudeStatus: next })
  }
}))
