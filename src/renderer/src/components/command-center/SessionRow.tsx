import { useState, useEffect, useRef } from 'react'
import type { AgentSession, AttentionItem, AttentionType } from '../../../../shared/types'
import { isTerminalStatus } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { StatusBadge } from '../shared/StatusBadge'
import { formatElapsed } from '../../lib/format'

interface SessionRowProps {
  session: AgentSession
  attentionItem?: AttentionItem
  focused?: boolean
  onDismissAttention?: (id: string) => void
}

export function SessionRow({ session, attentionItem, focused, onDismissAttention }: SessionRowProps) {
  const selectSession = useSessionStore(s => s.selectSession)
  const dismissAttentionItem = useSessionStore(s => s.dismissAttentionItem)
  const setViewMode = useUIStore(s => s.setViewMode)
  const openTerminalDrawer = useUIStore(s => s.openTerminalDrawer)

  const [showStopConfirm, setShowStopConfirm] = useState(false)

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
    const skipConfirm = localStorage.getItem('turbo:skipStopConfirm') === 'true'
    if (skipConfirm) {
      window.api.stopSession(session.id)
    } else {
      setShowStopConfirm(true)
    }
  }

  const confirmStop = (e: React.MouseEvent) => {
    e.stopPropagation()
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

  // Attention quick actions
  const handleNudge = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.sendTerminalInput(session.id, '\r')
    if (attentionItem) dismissAttentionItem(attentionItem.id)
  }

  const handleStopFromAttention = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.stopSession(session.id)
    if (attentionItem) dismissAttentionItem(attentionItem.id)
  }

  const elapsed = formatElapsed(session.startedAt, session.completedAt)
  const isActive = session.status === 'active' || session.status === 'starting'
  const isRunning = isActive || session.status === 'waiting_for_input' || session.status === 'paused'
  const isFinished = isTerminalStatus(session.status)

  const progress = useTimedProgress(session)

  // Action text
  const actionText = session.needsAttention && session.attentionMessage
    ? session.attentionMessage
    : session.currentAction || session.lastActivity || 'Starting...'
  const actionColor = session.needsAttention
    ? attentionTextColor(session.attentionType)
    : 'text-turbo-text-dim'

  // Attention styling
  const isAttention = session.needsAttention
  const attentionBorder = isAttention ? attentionBorderColor(session.attentionType) : ''
  const attentionBg = isAttention ? 'bg-turbo-warning/5' : ''

  // Focus styling
  const focusRing = focused ? 'bg-turbo-accent/5 ring-1 ring-inset ring-turbo-accent/20' : ''

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-center gap-3 px-4 h-10 border-b border-turbo-border/30
                  hover:bg-turbo-surface-hover cursor-pointer transition-colors group
                  ${isAttention ? `border-l-2 ${attentionBorder} ${attentionBg}` : ''}
                  ${focusRing}`}
    >
      {/* Status dot */}
      <div className="w-6 flex items-center justify-center flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${statusDotColor(session.status)} ${
          (isActive || session.status === 'waiting_for_input') ? 'animate-pulse' : ''
        }`} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-turbo-text truncate flex items-center gap-1.5">
          {session.status === 'completed' && (
            <svg className="w-3 h-3 text-turbo-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {session.name}
        </span>
      </div>

      {/* Current action */}
      <div className="flex-[2] min-w-0 hidden sm:block">
        <span className={`text-xs truncate block ${actionColor}`}>
          {actionText}
        </span>
      </div>

      {/* Duration */}
      <div className="w-[60px] text-right flex-shrink-0">
        <span className="text-xs text-turbo-text-muted font-mono">{elapsed}</span>
      </div>

      {/* Badge */}
      <div className="w-[56px] flex-shrink-0">
        <StatusBadge
          status={session.status}
          needsAttention={session.needsAttention}
          attentionType={session.attentionType}
          size="sm"
        />
      </div>

      {/* Actions — hover revealed or attention actions */}
      <div className="w-[72px] flex items-center justify-end gap-0.5 flex-shrink-0">
        {isAttention && session.attentionType === 'stuck' && (
          <button
            onClick={handleNudge}
            className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-accent/15 text-turbo-accent hover:bg-turbo-accent/25 transition-colors"
          >
            Nudge
          </button>
        )}
        {isAttention && session.attentionType === 'error' && (
          <button
            onClick={handleStopFromAttention}
            className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-error/15 text-turbo-error hover:bg-turbo-error/25 transition-colors"
          >
            Stop
          </button>
        )}
        <div className={`flex items-center gap-0.5 ${isAttention ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={handleTerminal}
            className="p-1 rounded hover:bg-turbo-surface-active transition-colors text-turbo-text-muted"
            title="Show Terminal"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="p-1 rounded hover:bg-turbo-error/20 text-turbo-error transition-colors"
              title="Stop Task"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}
          {isFinished && (
            <button
              onClick={handleRemove}
              className="p-1 rounded hover:bg-turbo-error/20 text-turbo-text-muted hover:text-turbo-error transition-colors"
              title="Remove"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — thin 2px at bottom */}
      {isRunning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-turbo-border/20">
          <div
            className={`h-full transition-all duration-1000 ease-out ${progressBarColor(session.status)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Inline stop confirm */}
      {showStopConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-turbo-bg/90 backdrop-blur-sm"
          onClick={cancelStop}
        >
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-turbo-text">Stop?</span>
            <button onClick={cancelStop} className="text-xs px-2 py-1 rounded bg-turbo-surface-active text-turbo-text-dim">No</button>
            <button onClick={confirmStop} className="text-xs px-2 py-1 rounded bg-turbo-error/20 text-turbo-error font-medium">Yes</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress Hook (from AgentCard) ──────────────────────────

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
    if (!isActive) return

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

function timeToProgress(ms: number): number {
  const s = ms / 1000
  return Math.min(90, (Math.log(1 + s / 10) / Math.log(61)) * 90)
}

// ─── Helpers ─────────────────────────────────────────────────

function statusDotColor(status: AgentSession['status']): string {
  switch (status) {
    case 'active':
    case 'starting':
      return 'bg-turbo-accent'
    case 'waiting_for_input':
      return 'bg-turbo-warning'
    case 'completed':
      return 'bg-turbo-success'
    case 'error':
      return 'bg-turbo-error'
    case 'stopped':
      return 'bg-turbo-text-muted'
    default:
      return 'bg-turbo-text-muted'
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

function attentionBorderColor(type?: AttentionType): string {
  switch (type) {
    case 'error':
    case 'stuck':
      return 'border-l-turbo-error'
    case 'decision':
      return 'border-l-turbo-warning'
    case 'completed':
    case 'review':
      return 'border-l-turbo-success'
    default:
      return 'border-l-turbo-warning'
  }
}

function progressBarColor(status: AgentSession['status']): string {
  switch (status) {
    case 'waiting_for_input':
      return 'bg-turbo-warning'
    case 'error':
      return 'bg-turbo-error/60'
    default:
      return 'bg-turbo-accent'
  }
}
