import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { NotificationRow } from './NotificationRow'

export function NotificationCenter() {
  const close = useUIStore(s => s.closeNotificationCenter)
  const items = useSessionStore(s => s.attentionItems)
  const markAllRead = useSessionStore(s => s.markAllRead)
  const clearAll = useSessionStore(s => s.clearAllNotifications)

  // Show all non-dismissed items, newest first
  const visibleItems = useMemo(
    () => items.filter(i => !i.dismissed),
    [items]
  )

  const hasUnread = useMemo(
    () => visibleItems.some(i => !i.read),
    [visibleItems]
  )

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={close}
        className="fixed inset-0 z-[49] bg-black/20"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 380 }}
        animate={{ x: 0 }}
        exit={{ x: 380 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="fixed top-[calc(2rem+41px)] right-0 bottom-0 w-[380px] z-[50] flex flex-col bg-turbo-bg border-l border-turbo-border shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-turbo-border">
          <h2 className="text-sm font-semibold text-turbo-text">Notifications</h2>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-turbo-accent hover:text-turbo-accent/80 transition-colors"
              >
                Mark all read
              </button>
            )}
            {visibleItems.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-turbo-text-muted hover:text-turbo-text transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-turbo-text-muted">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-turbo-border">
              {visibleItems.map(item => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
