import { useState, useEffect, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import type { AgentSession, AttentionType } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { StatusBadge } from '../shared/StatusBadge'
import { ProgressBar } from '../shared/ProgressBar'
import { formatElapsed } from '../../lib/format'

interface AgentCardProps {
  session: AgentSession
  focused?: boolean
}

export const AgentCard = memo(function AgentCard({ session, focused }: AgentCardProps) {
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)
  const openTerminalDrawer = useUIStore(s => s.openTerminalDrawer)

  const handleClick = () => {
    selectSession(session.id)
    setViewMode('detail')
  }

  const handleTerminal = (e: React.MouseEvent) => {
    e.stopPropagation()
    openTerminalDrawer(session.id)
  }

  const [showStopConfirm, setShowStopConfirm] = useState(false)

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    const skipConfirm = localStorage.getItem('turbo:skipStopConfirm') === 'true'
    if (skipConfirm) {
      window.api.stopSession(session.id)
    } else {
      setShowStopConfirm(true)
    }
  }

  const confirmStop = (e: React.MouseEvent, dontAskAgain: boolean) => {
    e.stopPropagation()
    if (dontAskAgain) {
      localStorage.setItem('turbo:skipStopConfirm', 'true')
    }
    window.api.stopSession(session.id)
    setShowStopConfirm(false)
  }

  const cancelStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowStopConfirm(false)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.removeSession(session.id)
  }

  const elapsed = formatElapsed(session.startedAt, session.completedAt)
  const isActive = session.status === 'active' || session.status === 'starting'
  const isRunning = isActive || session.status === 'waiting_for_input' || session.status === 'paused'
  const isFinished = session.status === 'completed' || session.status === 'stopped' || session.status === 'error'

  const progress = useTimedProgress(session)
  const borderClass = cardBorderClass(session.status, session.needsAttention, session.attentionType)

  // Action text: merge attention message when needs attention
  const actionText = session.needsAttention && session.attentionMessage
    ? session.attentionMessage
    : session.currentAction || session.lastActivity || 'Starting...'
  const actionColor = session.needsAttention
    ? attentionTextColor(session.attentionType)
    : 'text-turbo-text-dim'

  return (
    <motion.div
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`card p-4 cursor-pointer group relative overflow-hidden ${borderClass}${focused ? ' ring-1 ring-inset ring-turbo-accent/20 bg-turbo-accent/5' : ''}`}
    >
      {/* Active shimmer effect */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-turbo-accent/5 to-transparent
                        animate-shimmer bg-[length:200%_100%] pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <h3 className="text-sm font-medium text-turbo-text truncate flex-1 flex items-center gap-1.5">
          {session.status === 'completed' && <CheckmarkIcon />}
          {session.name}
        </h3>
        <StatusBadge
          status={session.status}
          needsAttention={session.needsAttention}
          attentionType={session.attentionType}
        />
      </div>

      {/* Current action / attention message */}
      <p className={`text-xs truncate mb-3 ${actionColor}`}>
        {actionText}
      </p>

      {/* Progress bar for all statuses */}
      <ProgressBar value={progress} status={session.status} className="mb-3" />

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-turbo-text-muted relative">
        <div className="flex items-center gap-3">
          <span>{elapsed}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleTerminal}
            className="p-1 rounded hover:bg-turbo-surface-active transition-colors"
            title="Show Terminal"
          >
            <TerminalIcon />
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="p-1 rounded hover:bg-turbo-error/20 text-turbo-error transition-colors"
              title="Stop Task"
            >
              <StopIcon />
            </button>
          )}
          {isFinished && (
            <button
              onClick={handleRemove}
              className="p-1 rounded hover:bg-turbo-error/20 text-turbo-text-muted hover:text-turbo-error transition-colors"
              title="Remove Task"
            >
              <DismissIcon />
            </button>
          )}
        </div>
      </div>

      {/* Stop confirmation dialog */}
      {showStopConfirm && <StopConfirmDialog onConfirm={confirmStop} onCancel={cancelStop} />}
    </motion.div>
  )
})

// ─── Hooks ─────────────────────────────────────────────────────

function useTimedProgress(session: AgentSession): number {
  const isActive = session.status === 'active' || session.status === 'starting'
  const frozenRef = useRef(0)
  const [progress, setProgress] = useState(() => {
    if (session.status === 'completed') return 100
    if (!isActive) return frozenRef.current
    return timeToProgress(Date.now() - session.startedAt)
  })

  useEffect(() => {
    if (session.status === 'completed') {
      setProgress(100)
      return
    }
    if (!isActive) {
      // Freeze at current value for error/stopped
      return
    }

    const tick = () => {
      const ms = Date.now() - session.startedAt
      const p = timeToProgress(ms)
      setProgress(p)
      frozenRef.current = p
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [session.status, session.startedAt, isActive])

  return progress
}

/** Logarithmic curve: fast early, asymptotic approach to 90% */
function timeToProgress(ms: number): number {
  const s = ms / 1000
  return Math.min(90, (Math.log(1 + s / 10) / Math.log(61)) * 90)
}

// ─── Helpers ────────────────────────────────────────────────────

function cardBorderClass(
  status: AgentSession['status'],
  needsAttention?: boolean,
  attentionType?: AttentionType
): string {
  if (needsAttention && attentionType) {
    switch (attentionType) {
      case 'error':
      case 'stuck':
        return 'border-turbo-error/50'
      case 'decision':
        return 'border-turbo-warning/50'
      case 'completed':
      case 'review':
        return 'border-turbo-success/40'
    }
  }
  switch (status) {
    case 'completed':
      return 'border-turbo-success/40'
    case 'error':
      return 'border-turbo-error/40'
    case 'stopped':
      return 'border-turbo-text-muted/30'
    default:
      return ''
  }
}

function attentionTextColor(type?: AttentionType): string {
  switch (type) {
    case 'error':
    case 'stuck':
      return 'text-turbo-error'
    case 'decision':
      return 'text-turbo-warning'
    case 'completed':
    case 'review':
      return 'text-turbo-success'
    default:
      return 'text-turbo-warning'
  }
}

function CheckmarkIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-turbo-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function DismissIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function StopConfirmDialog({
  onConfirm,
  onCancel
}: {
  onConfirm: (e: React.MouseEvent, dontAskAgain: boolean) => void
  onCancel: (e: React.MouseEvent) => void
}) {
  const [dontAsk, setDontAsk] = useState(false)

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-turbo-bg/90 backdrop-blur-sm rounded-xl"
      onClick={onCancel}
    >
      <div className="text-center px-4" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-medium text-turbo-text mb-3">Stop this task?</p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg bg-turbo-surface-active hover:bg-turbo-surface-hover text-turbo-text-dim transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => onConfirm(e, dontAsk)}
            className="px-3 py-1.5 text-xs rounded-lg bg-turbo-error/20 hover:bg-turbo-error/30 text-turbo-error font-medium transition-colors"
          >
            Stop
          </button>
        </div>
        <label
          className="flex items-center justify-center gap-1.5 cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={e => setDontAsk(e.target.checked)}
            className="w-3 h-3 rounded border-turbo-border accent-turbo-accent"
          />
          <span className="text-[10px] text-turbo-text-muted">Don't ask again</span>
        </label>
      </div>
    </div>
  )
}
