import { useMemo, useCallback } from 'react'
import { useSessionStore, useProjectSessions } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useUIStore } from '../../stores/useUIStore'
import { isTerminalStatus } from '../../../../shared/types'
import type { AgentSession } from '../../../../shared/types'
import { STATUS_DOT_COLORS, STATUS_ANIMATED } from '../../lib/sessionStatus'
import { formatElapsed } from '../../lib/format'

function SessionRow({ session, isSelected, isFocused, onSelect, onFocus }: {
  session: AgentSession
  isSelected: boolean
  isFocused: boolean
  onSelect: () => void
  onFocus: () => void
}) {
  const elapsed = formatElapsed(session.startedAt, session.completedAt)

  const colorClass = STATUS_DOT_COLORS[session.status]
  const pulse = STATUS_ANIMATED[session.status]

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onSelect()
  }, [onSelect])

  return (
    <button
      onClick={() => { onSelect(); onFocus() }}
      onContextMenu={handleContextMenu}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors group
        ${isFocused ? 'bg-turbo-accent/15 border border-turbo-accent/30' : isSelected ? 'bg-turbo-surface-active' : 'hover:bg-turbo-surface-active/50'}
      `}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
        {pulse && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${colorClass} animate-ping opacity-75`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-turbo-text truncate">
          {session.name}
        </div>
        {session.currentAction && (
          <div className="text-[10px] text-turbo-text-muted truncate mt-0.5">
            {session.currentAction}
          </div>
        )}
      </div>

      {/* Elapsed time */}
      <span className="text-[10px] text-turbo-text-muted flex-shrink-0 tabular-nums">
        {elapsed}
      </span>

      {!isTerminalStatus(session.status) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            window.api.stopSession(session.id)
          }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-4 h-4 flex items-center justify-center
                     text-turbo-text-muted hover:text-red-400 transition-all"
          title="Stop"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}
    </button>
  )
}

export function SessionSidebar() {
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const sessions = useProjectSessions(selectedProject?.path)
  const selectedSessionId = useSessionStore(s => s.selectedSessionId)
  const focusedSessionId = useSessionStore(s => s.focusedSessionId)
  const selectSession = useSessionStore(s => s.selectSession)
  const focusSession = useSessionStore(s => s.focusSession)
  const pinSession = useSessionStore(s => s.pinSession)
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  const { active, completed } = useMemo(() => {
    const active: AgentSession[] = []
    const completed: AgentSession[] = []
    const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
    for (const s of sorted) {
      if (isTerminalStatus(s.status)) completed.push(s)
      else active.push(s)
    }
    return { active, completed }
  }, [sessions])

  const handleSelect = useCallback((sessionId: string) => {
    selectSession(sessionId)
    pinSession(sessionId)
  }, [selectSession, pinSession])

  if (sidebarCollapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-r border-turbo-border/40 bg-turbo-bg flex flex-col items-center pt-3">
        <button
          onClick={toggleSidebar}
          className="w-6 h-6 flex items-center justify-center rounded text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {/* Compact status dots */}
        <div className="flex flex-col gap-1.5 mt-4">
          {active.map(s => (
            <button
              key={s.id}
              onClick={() => { handleSelect(s.id); focusSession(s.id) }}
              className="relative"
              title={s.name}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[s.status]}`} />
              {STATUS_ANIMATED[s.status] && (
                <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[s.status]} animate-ping opacity-75`} />
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 flex-shrink-0 border-r border-turbo-border/40 bg-turbo-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="text-xs font-semibold text-turbo-text-muted uppercase tracking-wider">Sessions</h2>
        <button
          onClick={toggleSidebar}
          className="w-5 h-5 flex items-center justify-center rounded text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {/* Active sessions */}
        {active.length > 0 && (
          <div className="space-y-0.5">
            {active.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                isSelected={selectedSessionId === s.id}
                isFocused={focusedSessionId === s.id}
                onSelect={() => handleSelect(s.id)}
                onFocus={() => focusSession(s.id)}
              />
            ))}
          </div>
        )}

        {/* Divider */}
        {active.length > 0 && completed.length > 0 && (
          <div className="border-t border-turbo-border/30 my-2" />
        )}

        {/* Completed sessions */}
        {completed.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-turbo-text-muted/60 uppercase tracking-wider px-3 py-1">
              Recent
            </p>
            {completed.slice(0, 20).map(s => (
              <SessionRow
                key={s.id}
                session={s}
                isSelected={selectedSessionId === s.id}
                isFocused={focusedSessionId === s.id}
                onSelect={() => handleSelect(s.id)}
                onFocus={() => focusSession(s.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-turbo-text-muted/60">No sessions yet</p>
            <p className="text-[10px] text-turbo-text-muted/40 mt-1">Type below to start</p>
          </div>
        )}
      </div>

      {/* Resume hint */}
      {completed.length > 0 && (
        <div className="px-3 py-2 border-t border-turbo-border/20">
          <p className="text-[10px] text-turbo-text-muted/50">
            Click a session to resume it
          </p>
        </div>
      )}
    </div>
  )
}
