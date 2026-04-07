import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTourStore } from '../../stores/useTourStore'
import { TOUR_STEPS } from './tourSteps'
import { TourStep } from './TourStep'
import { TourSpotlight } from './TourSpotlight'

export function OnboardingTour() {
  const { currentStep, nextStep, prevStep, endTour } = useTourStore(
    useShallow(s => ({
      currentStep: s.currentStep,
      nextStep: s.nextStep,
      prevStep: s.prevStep,
      endTour: s.endTour,
    }))
  )

  const step = TOUR_STEPS[currentStep]
  if (!step) return null

  const hasSpotlight = !!step.spotlightSelector

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[46]"
    >
      {!hasSpotlight && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      )}

      {hasSpotlight && (
        <TourSpotlight
          selector={step.spotlightSelector!}
          padding={step.spotlightPadding}
        />
      )}

      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            <TourStep
              key={step.id}
              step={step}
              currentIndex={currentStep}
              totalSteps={TOUR_STEPS.length}
              onNext={nextStep}
              onPrev={prevStep}
              onSkip={endTour}
            />
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
