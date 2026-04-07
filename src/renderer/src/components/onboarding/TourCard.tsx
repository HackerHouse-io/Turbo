import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface TourCardProps {
  cardKey: string
  illustration?: ReactNode
  currentIndex: number
  totalSteps: number
  actions: ReactNode
  children: ReactNode
}

/** Shared visual shell for tour cards: motion wrapper, illustration slot,
 *  body, progress dots, and action buttons. */
export function TourCard({
  cardKey,
  illustration,
  currentIndex,
  totalSteps,
  actions,
  children
}: TourCardProps) {
  return (
    <motion.div
      key={cardKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full max-w-md bg-turbo-surface-active border border-turbo-border-bright rounded-xl shadow-2xl ring-1 ring-turbo-accent/10 overflow-hidden"
    >
      {illustration && (
        <div className="w-full border-b border-turbo-border-bright bg-turbo-bg/60">
          {illustration}
        </div>
      )}

      <div className="p-6">{children}</div>

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

        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </motion.div>
  )
}
