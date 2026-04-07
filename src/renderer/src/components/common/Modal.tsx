import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ModalProps {
  /** Called when the user clicks the backdrop. Esc handling lives in AppShell. */
  onDismiss: () => void
  /** Tailwind width class — defaults to `max-w-md`. */
  maxWidthClass?: string
  /** Tailwind z-index class — defaults to `z-[50]`. Use a higher value for blocking interrupts. */
  zClass?: string
  children: ReactNode
}

/**
 * Centered modal shell with backdrop blur and the standard Turbo
 * framer-motion entrance/exit. Mount inside an `<AnimatePresence>` so
 * exit animations play. Children render the modal body — they should
 * NOT include their own `motion.div` or backdrop.
 */
export function Modal({ onDismiss, maxWidthClass = 'max-w-md', zClass = 'z-[50]', children }: ModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/50 backdrop-blur-sm`}
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className={`w-full ${maxWidthClass} mx-4 bg-turbo-surface border border-turbo-border rounded-xl shadow-2xl overflow-hidden`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
