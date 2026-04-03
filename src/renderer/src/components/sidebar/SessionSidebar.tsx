import { useMemo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore, useProjectSessions } from '../../stores/useSessionStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useUIStore } from '../../stores/useUIStore'
import { useTerminalStore, type Workspace } from '../../stores/useTerminalStore'
import { isTerminalStatus } from '../../../../shared/types'
import type { AgentSession } from '../../../../shared/types'
import { STATUS_DOT_COLORS, STATUS_ANIMATED } from '../../lib/sessionStatus'
import { formatElapsed } from '../../lib/format'

// ─── Delete Confirmation Alert ──────────────────────────────────

function DeleteAlert({ sessionName, onConfirm, onCancel }: {
  sessionName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="mx-2 my-1 px-3 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-[11px] text-turbo-text mb-0.5">
          Delete <span className="font-semibold">{sessionName}</span>?
        </p>
        <p className="text-[11px] text-turbo-text-dim mb-3">
          This will permanently remove the session and its history.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 h-7 rounded-md text-[11px] font-medium bg-red-500 text-white
                       hover:bg-red-600 active:scale-[0.97] transition-all"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-7 rounded-md text-[11px] font-medium bg-turbo-surface border border-turbo-border
                       text-turbo-text-dim hover:bg-turbo-surface-active transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Session Row ────────────────────────────────────────────────

function SessionRow({ session, isSelected, isFocused, onSelect, onFocus, onRequestDelete }: {
  session: AgentSession
  isSelected: boolean
  isFocused: boolean
  onSelect: () => void
  onFocus: () => void
  onRequestDelete: () => void
}) {
  const elapsed = formatElapsed(session.startedAt, session.completedAt)
  const colorClass = STATUS_DOT_COLORS[session.status]
  const pulse = STATUS_ANIMATED[session.status]
  const isActive = !isTerminalStatus(session.status)

  return (
    <button
      onClick={() => { onSelect(); onFocus() }}
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

      <span className="text-[10px] text-turbo-text-muted flex-shrink-0 tabular-nums group-hover:hidden">
        {elapsed}
      </span>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.stopSession(session.id)
            }}
            className="w-5 h-5 flex items-center justify-center rounded
                       text-turbo-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
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
            onRequestDelete()
          }}
          className="w-5 h-5 flex items-center justify-center rounded
                     text-turbo-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete session"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </button>
  )
}

// ─── Workspace Row ──────────────────────────────────────────────

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const terminals = useTerminalStore(s => s.terminals)
  const openTerminalWorkspace = useUIStore(s => s.openTerminalWorkspace)

  const panes = workspace.terminalIds.map(id => terminals[id]).filter(Boolean)
  const shellCount = panes.filter(p => p.type === 'shell').length
  const claudeCount = panes.filter(p => p.type === 'claude').length

  const summary = [
    shellCount > 0 ? `${shellCount} shell` : '',
    claudeCount > 0 ? `${claudeCount} claude` : ''
  ].filter(Boolean).join(', ') || 'empty'

  return (
    <button
      onClick={() => openTerminalWorkspace(workspace.id)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors
                 hover:bg-turbo-surface-active/50 group"
    >
      <svg className="w-3.5 h-3.5 text-turbo-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-turbo-text truncate">{workspace.name}</div>
        <div className="text-[10px] text-turbo-text-muted">{summary}</div>
      </div>
      <span className="text-[10px] text-turbo-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Open
      </span>
    </button>
  )
}

// ─── Sidebar ────────────────────────────────────────────────────

export function SessionSidebar() {
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const selectedProjectPath = useProjectStore(selectProjectPath)
  const sessions = useProjectSessions(selectedProject?.path)
  const selectedSessionId = useSessionStore(s => s.selectedSessionId)
  const focusedSessionId = useSessionStore(s => s.focusedSessionId)
  const selectSession = useSessionStore(s => s.selectSession)
  const focusSession = useSessionStore(s => s.focusSession)
  const pinSession = useSessionStore(s => s.pinSession)
  const unpinSession = useSessionStore(s => s.unpinSession)
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  const workspaces = useTerminalStore(s => s.workspaces)
  const createWorkspace = useTerminalStore(s => s.createWorkspace)
  const addTerminalToWorkspace = useTerminalStore(s => s.addTerminalToWorkspace)
  const openTerminalWorkspace = useUIStore(s => s.openTerminalWorkspace)

  const [termMenuOpen, setTermMenuOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  const projectWorkspaces = useMemo(() =>
    Object.values(workspaces)
      .filter(ws => ws.projectPath === selectedProjectPath)
      .sort((a, b) => a.createdAt - b.createdAt),
    [workspaces, selectedProjectPath]
  )

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

  const handleDelete = useCallback((sessionId: string) => {
    // Stop if still active, unpin from grid, remove from store + database
    const session = useSessionStore.getState().sessions[sessionId]
    if (session && !isTerminalStatus(session.status)) {
      window.api.stopSession(sessionId)
    }
    unpinSession(sessionId)
    window.api.removeSession(sessionId)
    setDeletingSessionId(null)
  }, [unpinSession])

  const handleNewTerminal = useCallback(async (type: 'shell' | 'claude') => {
    if (!selectedProjectPath) return
    setTermMenuOpen(false)
    let wsId = projectWorkspaces.length > 0 ? projectWorkspaces[0].id : null
    if (!wsId) {
      wsId = createWorkspace(selectedProjectPath)
    }
    const terminal = await window.api.createPlainTerminal({ projectPath: selectedProjectPath, type })
    if (terminal) addTerminalToWorkspace(wsId, terminal.id)
    openTerminalWorkspace(wsId)
  }, [selectedProjectPath, projectWorkspaces, createWorkspace, addTerminalToWorkspace, openTerminalWorkspace])

  // ─── Collapsed state ──────────────────────────────────────

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
        {projectWorkspaces.length > 0 && (
          <button
            onClick={() => openTerminalWorkspace()}
            className="mt-auto mb-3 w-6 h-6 flex items-center justify-center rounded text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active transition-colors"
            title="Open terminal workspace"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // ─── Helper to render a session row + its delete alert ────

  const renderSession = (s: AgentSession) => (
    <div key={s.id}>
      <SessionRow
        session={s}
        isSelected={selectedSessionId === s.id}
        isFocused={focusedSessionId === s.id}
        onSelect={() => handleSelect(s.id)}
        onFocus={() => focusSession(s.id)}
        onRequestDelete={() => setDeletingSessionId(s.id)}
      />
      <AnimatePresence>
        {deletingSessionId === s.id && (
          <DeleteAlert
            sessionName={s.name}
            onConfirm={() => handleDelete(s.id)}
            onCancel={() => setDeletingSessionId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )

  // ─── Expanded state ───────────────────────────────────────

  return (
    <div className="w-60 flex-shrink-0 border-r border-turbo-border/40 bg-turbo-bg flex flex-col">
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

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {active.length > 0 && (
          <div className="space-y-0.5">
            {active.map(renderSession)}
          </div>
        )}

        {active.length > 0 && completed.length > 0 && (
          <div className="border-t border-turbo-border/30 my-2" />
        )}

        {completed.length > 0 && (
          <div>
            <p className="text-[10px] text-turbo-text-muted uppercase tracking-wider px-3 py-1">
              Recent
            </p>
            <div className="space-y-0.5">
              {completed.slice(0, 20).map(renderSession)}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-turbo-text-muted">No sessions yet</p>
            <p className="text-[10px] text-turbo-text-muted mt-1">Type below to start</p>
          </div>
        )}
      </div>

      {/* ─── Terminals section ────────────────────────────────── */}
      <div className="border-t border-turbo-border/30">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <h2 className="text-xs font-semibold text-turbo-text-muted uppercase tracking-wider">Terminals</h2>
          <div className="relative">
            <button
              onClick={() => setTermMenuOpen(o => !o)}
              className="w-5 h-5 flex items-center justify-center rounded text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active transition-colors"
              title="New terminal"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            {termMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTermMenuOpen(false)} />
                <div className="absolute right-0 bottom-full mb-1 w-40 bg-turbo-surface border border-turbo-border rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => handleNewTerminal('shell')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs text-turbo-text hover:bg-turbo-surface-hover transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-turbo-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Shell
                  </button>
                  <button
                    onClick={() => handleNewTerminal('claude')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs text-turbo-text hover:bg-turbo-surface-hover transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-turbo-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    Claude Code
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-2 pb-3 space-y-0.5">
          {projectWorkspaces.map(ws => (
            <WorkspaceRow key={ws.id} workspace={ws} />
          ))}
          {projectWorkspaces.length === 0 && (
            <p className="text-[10px] text-turbo-text-muted px-3 py-2">
              No terminals open
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
