import { motion } from 'framer-motion'
import type { AttentionItem, Project } from '../../../../shared/types'
import { ATTENTION_TYPE_COLORS } from '../../../../shared/constants'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { timeAgo } from '../../lib/format'
import { fadeIn } from '../../lib/animations'

interface AttentionFeedItemProps {
  item: AttentionItem
  project: Project | undefined
}

export function AttentionFeedItem({ item, project }: AttentionFeedItemProps) {
  const dotColor = ATTENTION_TYPE_COLORS[item.type]

  const isActionable = item.type === 'error' || item.type === 'stuck' || item.type === 'decision'
  const isDismissable = item.type === 'review' || item.type === 'completed'

  const handleView = () => {
    useSessionStore.getState().markItemRead(item.id)
    useSessionStore.getState().selectSession(item.sessionId)
    useSessionStore.getState().pinSession(item.sessionId)
    useSessionStore.getState().focusSession(item.sessionId)
    useUIStore.getState().hideOverview()
  }

  const handleDismiss = () => {
    useSessionStore.getState().dismissAttentionItem(item.id)
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      exit="hidden"
      layout
      className="flex items-start gap-3 px-4 py-3 hover:bg-turbo-surface-hover transition-colors rounded-lg"
    >
      {/* Project color dot */}
      {project && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: project.color }}
        />
      )}

      {/* Attention type dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {project && (
            <span className="text-[10px] font-medium text-turbo-text-muted">{project.name}</span>
          )}
          <span className="text-sm font-medium text-turbo-text truncate">{item.title}</span>
          <span className="text-[10px] text-turbo-text-muted flex-shrink-0 ml-auto">{timeAgo(item.timestamp)}</span>
        </div>
        {item.message && (
          <p className="text-xs text-turbo-text-muted mt-0.5 line-clamp-1">{item.message}</p>
        )}
      </div>

      {/* Action button */}
      {isActionable && (
        <button
          onClick={handleView}
          className="text-[11px] px-2 py-1 rounded bg-turbo-surface-hover text-turbo-text-dim
                     hover:bg-turbo-accent/20 hover:text-turbo-accent transition-colors flex-shrink-0"
        >
          View
        </button>
      )}
      {isDismissable && (
        <button
          onClick={handleDismiss}
          className="text-[11px] px-2 py-1 rounded bg-turbo-surface-hover text-turbo-text-dim
                     hover:bg-turbo-surface-hover/80 transition-colors flex-shrink-0"
        >
          Dismiss
        </button>
      )}
    </motion.div>
  )
}
