import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { ToastItem } from '../../stores/useNotificationStore'
import type { AttentionType } from '../../../../shared/types'
import { useNotificationStore } from '../../stores/useNotificationStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { ATTENTION_TYPE_COLORS } from '../../../../shared/constants'
import { timeAgo } from '../../lib/format'

const TYPE_ICONS: Record<AttentionType, string> = {
  error: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  completed: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  decision: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  stuck: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z',
  review: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
}

const AUTO_DISMISS_MS = 5000

export function NotificationToast({ toast }: { toast: ToastItem }) {
  const dismissToast = useNotificationStore(s => s.dismissToast)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    timerRef.current = setTimeout(() => {
      dismissToast(toast.id)
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [paused, toast.id, dismissToast])

  const item = toast.attentionItem
  const colorClass = ATTENTION_TYPE_COLORS[item.type]
  const iconPath = TYPE_ICONS[item.type]

  const handleClick = () => {
    dismissToast(toast.id)
    useSessionStore.getState().selectSession(item.sessionId)
    useUIStore.getState().setViewMode('detail')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={handleClick}
      className="relative flex overflow-hidden rounded-lg border border-turbo-border bg-turbo-surface shadow-lg cursor-pointer hover:bg-turbo-surface-hover transition-colors w-[340px]"
    >
      {/* Color stripe */}
      <div className={`w-1 flex-shrink-0 ${colorClass}`} />

      <div className="flex items-start gap-2.5 p-3 flex-1 min-w-0">
        {/* Icon */}
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-turbo-text truncate">{item.title}</span>
            <span className="text-[10px] text-turbo-text-muted flex-shrink-0">{timeAgo(item.timestamp)}</span>
          </div>
          {item.message && (
            <p className="text-xs text-turbo-text-muted mt-0.5 line-clamp-2">{item.message}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); dismissToast(toast.id) }}
          className="p-0.5 rounded hover:bg-turbo-surface-active text-turbo-text-muted hover:text-turbo-text transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
