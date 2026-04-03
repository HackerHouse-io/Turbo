import { XTermRenderer } from './XTermRenderer'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useShallow } from 'zustand/react/shallow'
import { isTerminalStatus } from '../../../../shared/types'
import type { AgentSession } from '../../../../shared/types'
import { STATUS_DOT_COLORS, STATUS_LABELS } from '../../lib/sessionStatus'

function TerminalPane({ session, isFocused, onFocus, onClose }: {
  session: AgentSession
  isFocused: boolean
  onFocus: () => void
  onClose: () => void
}) {
  const isActive = !isTerminalStatus(session.status)

  return (
    <div
      onClick={onFocus}
      className={`flex flex-col rounded-lg overflow-hidden border transition-colors
        ${isFocused ? 'border-turbo-accent/50' : 'border-turbo-border/30 hover:border-turbo-border/60'}
      `}
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 flex-shrink-0 group/header
        ${isFocused ? 'bg-turbo-accent/10' : 'bg-turbo-surface/50'}
      `}>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[session.status]}`} />
        <span className="text-[11px] font-medium text-turbo-text truncate flex-1">
          {session.name}
        </span>
        <span className="text-[10px] text-turbo-text-muted">
          {STATUS_LABELS[session.status]}
        </span>
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.stopSession(session.id)
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/15 text-turbo-text-muted hover:text-red-400 transition-colors"
            title="Stop session"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="w-5 h-5 flex items-center justify-center rounded
                     text-turbo-text-muted/40 hover:text-turbo-text hover:bg-white/[0.06]
                     opacity-0 group-hover/header:opacity-100 transition-all"
          title="Close pane"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <XTermRenderer terminalId={session.id} mode="session" />
      </div>
    </div>
  )
}

export function TerminalGrid() {
  const focusedSessionId = useSessionStore(s => s.focusedSessionId)
  const focusSession = useSessionStore(s => s.focusSession)
  const unpinSession = useSessionStore(s => s.unpinSession)
  const projectPath = useProjectStore(selectProjectPath)

  // Derive visible sessions with useShallow to avoid re-renders on unrelated session changes
  const visibleSessions = useSessionStore(
    useShallow(s => {
      if (!projectPath) return []
      const pinned = s.pinnedSessionIds
        .map(id => s.sessions[id])
        .filter((x): x is AgentSession => !!x && x.projectPath === projectPath)
      if (pinned.length > 0) return pinned.slice(0, 4)
      return Object.values(s.sessions)
        .filter(x => x.projectPath === projectPath && !isTerminalStatus(x.status))
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 4)
    })
  )

  if (visibleSessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-turbo-surface border border-turbo-border/40
                          flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-turbo-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm text-turbo-text-dim mb-1">No active sessions</p>
          <p className="text-xs text-turbo-text-muted/60">
            Type what you want to work on below and hit <kbd className="kbd text-[10px] px-1 py-0.5">&#8984;&#8617;</kbd>
          </p>
        </div>
      </div>
    )
  }

  // Grid layout based on count
  const gridClass = visibleSessions.length === 1
    ? 'grid-cols-1 grid-rows-1'
    : visibleSessions.length === 2
    ? 'grid-cols-2 grid-rows-1'
    : 'grid-cols-2 grid-rows-2'

  return (
    <div className={`flex-1 grid ${gridClass} gap-1 p-1 min-h-0`}>
      {visibleSessions.map(session => (
        <TerminalPane
          key={session.id}
          session={session}
          isFocused={focusedSessionId === session.id}
          onFocus={() => focusSession(session.id)}
          onClose={() => unpinSession(session.id)}
        />
      ))}
    </div>
  )
}
