import type { AttentionItem } from '../../../../shared/types'
import { ATTENTION_TYPE_COLORS } from '../../../../shared/constants'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { timeAgo } from '../../lib/format'

export function NotificationRow({ item }: { item: AttentionItem }) {
  const dotColor = ATTENTION_TYPE_COLORS[item.type]

  const handleClick = () => {
    useSessionStore.getState().markItemRead(item.id)
    useSessionStore.getState().selectSession(item.sessionId)
    useUIStore.getState().setViewMode('detail')
    useUIStore.getState().closeNotificationCenter()
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-turbo-surface-hover transition-colors"
    >
      {/* Type dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-turbo-text truncate">{item.title}</span>
          <span className="text-[10px] text-turbo-text-muted flex-shrink-0">{timeAgo(item.timestamp)}</span>
        </div>
        {item.message && (
          <p className="text-xs text-turbo-text-muted mt-0.5 line-clamp-2">{item.message}</p>
        )}
      </div>

      {/* Unread dot */}
      {!item.read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}
