import { motion } from 'framer-motion'
import type { AgentSession } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { StatusBadge } from '../shared/StatusBadge'
import { ProgressBar } from '../shared/ProgressBar'

interface AgentCardProps {
  session: AgentSession
}

export function AgentCard({ session }: AgentCardProps) {
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

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.stopSession(session.id)
  }

  const elapsed = getElapsedTime(session.startedAt, session.completedAt)
  const isActive = session.status === 'active' || session.status === 'starting'
  const progress = estimateProgress(session)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`card p-4 cursor-pointer group relative overflow-hidden ${
        session.needsAttention ? 'border-turbo-warning/50' : ''
      }`}
    >
      {/* Active shimmer effect */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-turbo-accent/5 to-transparent
                        animate-shimmer bg-[length:200%_100%] pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <h3 className="text-sm font-medium text-turbo-text truncate flex-1">
          {session.name}
        </h3>
        <StatusBadge status={session.status} needsAttention={session.needsAttention} />
      </div>

      {/* Current action */}
      <p className="text-xs text-turbo-text-dim truncate mb-3">
        {session.currentAction || session.lastActivity || 'Starting...'}
      </p>

      {/* Progress bar for active sessions */}
      {isActive && <ProgressBar value={progress} className="mb-3" />}

      {/* Attention message */}
      {session.needsAttention && session.attentionMessage && (
        <div className="text-xs text-turbo-warning bg-turbo-warning/10 rounded px-2 py-1.5 mb-3 line-clamp-2">
          {session.attentionMessage}
        </div>
      )}

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
          {isActive && (
            <button
              onClick={handleStop}
              className="p-1 rounded hover:bg-turbo-error/20 text-turbo-error transition-colors"
              title="Stop Task"
            >
              <StopIcon />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function getElapsedTime(start: number, end?: number): string {
  const ms = (end || Date.now()) - start
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function estimateProgress(session: AgentSession): number {
  // Rough heuristic based on blocks
  const blocks = session.activityBlocks.length
  if (blocks === 0) return 5
  if (blocks < 3) return 15
  if (blocks < 6) return 35
  if (blocks < 10) return 55
  if (blocks < 15) return 75
  return 85
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
