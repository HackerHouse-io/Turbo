import { motion } from 'framer-motion'
import type { AttentionItem } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { timeAgo } from '../../lib/format'

// ─── Quick Action Types ──────────────────────────────────────

interface QuickAction {
  label: string
  variant: 'primary' | 'danger' | 'ghost'
  action: 'pty-input' | 'open-terminal' | 'stop-session' | 'open-detail'
  ptyInput?: string
}

function getQuickActions(item: AttentionItem): QuickAction[] {
  switch (item.type) {
    case 'decision': {
      const msg = item.message
      if (/allow/i.test(msg) || /\(y\/n\)/i.test(msg)) {
        return [
          { label: 'Allow', variant: 'primary', action: 'pty-input', ptyInput: 'yes\r' },
          { label: 'Deny', variant: 'danger', action: 'pty-input', ptyInput: 'no\r' }
        ]
      }
      return [
        { label: 'Yes', variant: 'primary', action: 'pty-input', ptyInput: 'yes\r' },
        { label: 'No', variant: 'danger', action: 'pty-input', ptyInput: 'no\r' },
        { label: 'Open Terminal', variant: 'ghost', action: 'open-terminal' }
      ]
    }
    case 'stuck':
      return [
        { label: 'Nudge', variant: 'primary', action: 'pty-input', ptyInput: '\r' },
        { label: 'Open Terminal', variant: 'ghost', action: 'open-terminal' }
      ]
    case 'error':
      return [
        { label: 'Open Terminal', variant: 'ghost', action: 'open-terminal' },
        { label: 'Stop Task', variant: 'danger', action: 'stop-session' }
      ]
    case 'review':
    case 'completed':
      return [
        { label: 'Open', variant: 'primary', action: 'open-detail' }
      ]
    default:
      return [
        { label: 'Open', variant: 'ghost', action: 'open-detail' }
      ]
  }
}

// ─── Component ───────────────────────────────────────────────

interface AttentionQueueProps {
  items: AttentionItem[]
}

export function AttentionQueue({ items }: AttentionQueueProps) {
  const dismissAttentionItem = useSessionStore(s => s.dismissAttentionItem)
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)
  const openTerminalDrawer = useUIStore(s => s.openTerminalDrawer)

  const handleQuickAction = (item: AttentionItem, qa: QuickAction) => {
    switch (qa.action) {
      case 'pty-input':
        if (qa.ptyInput) {
          window.api.sendTerminalInput(item.sessionId, qa.ptyInput)
        }
        dismissAttentionItem(item.id)
        break
      case 'open-terminal':
        openTerminalDrawer(item.sessionId)
        break
      case 'stop-session':
        window.api.stopSession(item.sessionId)
        dismissAttentionItem(item.id)
        break
      case 'open-detail':
        selectSession(item.sessionId)
        setViewMode('detail')
        dismissAttentionItem(item.id)
        break
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-turbo-warning animate-pulse-gentle" />
        <h2 className="text-sm font-medium text-turbo-text-dim uppercase tracking-wider">
          Attention Queue
        </h2>
        <span className="text-xs text-turbo-text-muted">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const actions = getQuickActions(item)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card p-3 border-l-2 ${borderColor(item.type)}`}
            >
              <div className="flex items-start gap-3">
                <AttentionIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted">
                      {typeLabel(item.type)}
                    </span>
                    <span className="text-[10px] text-turbo-text-muted">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-turbo-text mb-1">{item.title}</h3>
                  <p className="text-xs text-turbo-text-dim line-clamp-2">{item.message}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {actions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(item, qa)}
                      className={actionButtonClass(qa.variant)}
                    >
                      {qa.label}
                    </button>
                  ))}
                  <button
                    onClick={() => dismissAttentionItem(item.id)}
                    className="p-1 rounded hover:bg-turbo-surface-active text-turbo-text-muted transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function actionButtonClass(variant: QuickAction['variant']): string {
  const base = 'text-xs px-2.5 py-1 rounded font-medium transition-colors'
  switch (variant) {
    case 'primary':
      return `${base} bg-turbo-accent/15 text-turbo-accent hover:bg-turbo-accent/25`
    case 'danger':
      return `${base} bg-turbo-error/15 text-turbo-error hover:bg-turbo-error/25`
    case 'ghost':
      return `${base} btn-ghost`
  }
}

function borderColor(type: AttentionItem['type']): string {
  switch (type) {
    case 'decision': return 'border-l-turbo-warning'
    case 'stuck': return 'border-l-turbo-error'
    case 'error': return 'border-l-turbo-error'
    case 'review': return 'border-l-turbo-success'
    case 'completed': return 'border-l-turbo-success'
    default: return 'border-l-turbo-border-bright'
  }
}

function typeLabel(type: AttentionItem['type']): string {
  switch (type) {
    case 'decision': return 'Decision Needed'
    case 'stuck': return 'Task Stuck'
    case 'error': return 'Error'
    case 'review': return 'Ready for Review'
    case 'completed': return 'Completed'
    default: return type
  }
}

function AttentionIcon({ type }: { type: AttentionItem['type'] }) {
  const color = type === 'decision' || type === 'stuck' || type === 'error'
    ? 'text-turbo-warning'
    : 'text-turbo-success'

  return (
    <div className={`mt-0.5 ${color}`}>
      {type === 'completed' || type === 'review' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )}
    </div>
  )
}

