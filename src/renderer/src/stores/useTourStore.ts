import { create } from 'zustand'
import { TOUR_STEPS } from '../components/onboarding/tourSteps'

const SETTING_KEY = 'onboardingCompleted'

interface TourState {
  tourOpen: boolean
  currentStep: number

  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  restartTour: () => void
}

export const useTourStore = create<TourState>((set, get) => ({
  tourOpen: false,
  currentStep: 0,

  startTour: () => set({ tourOpen: true, currentStep: 0 }),

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
    set({ tourOpen: true, currentStep: 0 })
  }
}))
