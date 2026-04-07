import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ILLUSTRATIONS } from './tourIllustrations'
import type { TourStepDef } from './tourSteps'

interface TourStepProps {
  step: TourStepDef
  currentIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

/** Renders **text** as a `kbd` keycap. Plain text otherwise. */
function renderDescription(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <kbd key={i} className="kbd mx-0.5">{part.slice(2, -2)}</kbd>
    }
    return <span key={i}>{part}</span>
  })
}

export function TourStep({ step, currentIndex, totalSteps, onNext, onPrev, onSkip }: TourStepProps) {
  const Illustration = ILLUSTRATIONS[step.illustration]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalSteps - 1
  const description = useMemo(() => renderDescription(step.description), [step.description])

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full max-w-md bg-turbo-surface-active border border-turbo-border-bright rounded-xl shadow-2xl ring-1 ring-turbo-accent/10 overflow-hidden"
    >
      {Illustration && (
        <div className="w-full border-b border-turbo-border-bright bg-turbo-bg/60">
          <Illustration />
        </div>
      )}

      <div className="p-6">
        <h3 className="text-base font-semibold text-turbo-text mb-2">{step.title}</h3>
        <p className="text-sm text-turbo-text-dim leading-relaxed">{description}</p>

        {step.shortcuts && step.shortcuts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {step.shortcuts.map(s => (
              <kbd key={s} className="kbd text-xs">{s}</kbd>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex
                  ? 'bg-turbo-accent'
                  : i < currentIndex
                    ? 'bg-turbo-accent/40'
                    : 'bg-turbo-border-bright'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isLast && (
            <button
              onClick={onSkip}
              className="text-xs text-turbo-text-muted hover:text-turbo-text transition-colors px-2 py-1"
            >
              Skip
            </button>
          )}

          {!isFirst && (
            <button
              onClick={onPrev}
              className="h-8 px-3 rounded-lg text-xs font-medium border border-turbo-border
                         text-turbo-text-dim hover:text-turbo-text hover:bg-turbo-surface-hover
                         transition-colors"
            >
              Back
            </button>
          )}

          <button
            onClick={onNext}
            className="h-8 px-4 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                       text-white transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
