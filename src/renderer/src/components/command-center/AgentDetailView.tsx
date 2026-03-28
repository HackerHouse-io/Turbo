import { motion } from 'framer-motion'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { StatusBadge } from '../shared/StatusBadge'
import { XTermRenderer } from '../terminal/XTermRenderer'
import type { AgentSession } from '../../../../shared/types'

interface AgentDetailViewProps {
  sessionId: string
}

export function AgentDetailView({ sessionId }: AgentDetailViewProps) {
  const session = useSessionStore(s => s.sessions[sessionId])
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-turbo-text-dim">
        Session not found
      </div>
    )
  }

  const handleBack = () => {
    selectSession(null)
    setViewMode('dashboard')
  }

  const elapsed = getElapsed(session.startedAt, session.completedAt)
  const isActive = session.status === 'active' || session.status === 'starting'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col"
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-turbo-border bg-turbo-surface/50">
        <button
          onClick={handleBack}
          className="btn-ghost flex items-center gap-1 text-turbo-text-dim hover:text-turbo-text"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-turbo-text truncate">
              {session.name}
            </h1>
            <StatusBadge status={session.status} needsAttention={session.needsAttention} />
          </div>
          <div className="flex items-center gap-3 text-xs text-turbo-text-muted mt-0.5">
            {session.branch && <span>Branch: {session.branch}</span>}
            <span>{elapsed}</span>
            <span>{session.tokenCount.toLocaleString()} tokens</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={() => window.api.stopSession(sessionId)}
              className="btn-ghost text-xs text-turbo-error hover:bg-turbo-error/10"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Content area — full terminal + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Live terminal (main area) */}
        <div className="flex-1 overflow-hidden">
          <XTermRenderer sessionId={sessionId} />
        </div>

        {/* Context sidebar */}
        <div className="w-56 border-l border-turbo-border bg-turbo-surface/30 p-4 overflow-y-auto flex-shrink-0">
          <ContextSection title="Status">
            <StatusBadge status={session.status} needsAttention={session.needsAttention} size="md" />
          </ContextSection>

          {session.prompt && (
            <ContextSection title="Prompt">
              <p className="text-xs text-turbo-text-dim leading-relaxed">{session.prompt}</p>
            </ContextSection>
          )}

          <ContextSection title="Stats">
            <div className="space-y-1.5 text-xs">
              <StatRow label="Duration" value={elapsed} />
              <StatRow label="Tokens" value={session.tokenCount.toLocaleString()} />
            </div>
          </ContextSection>

          <ContextSection title="Files Touched">
            <FileList blocks={session.activityBlocks} />
          </ContextSection>
        </div>
      </div>
    </motion.div>
  )
}

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-turbo-text-dim">
      <span>{label}</span>
      <span className="text-turbo-text font-mono">{value}</span>
    </div>
  )
}

function FileList({ blocks }: { blocks: AgentSession['activityBlocks'] }) {
  const allFiles = new Set<string>()
  for (const block of blocks) {
    if (block.files) {
      for (const f of block.files) allFiles.add(f)
    }
  }

  if (allFiles.size === 0) {
    return <p className="text-xs text-turbo-text-muted">No files yet</p>
  }

  return (
    <ul className="space-y-0.5">
      {Array.from(allFiles).slice(0, 20).map(f => (
        <li key={f} className="text-xs text-turbo-text-dim font-mono truncate">{f}</li>
      ))}
      {allFiles.size > 20 && (
        <li className="text-xs text-turbo-text-muted">+{allFiles.size - 20} more</li>
      )}
    </ul>
  )
}

function getElapsed(start: number, end?: number): string {
  const ms = (end || Date.now()) - start
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
