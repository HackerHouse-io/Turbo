import { useMemo } from 'react'
import { useSessionStore } from '../../stores/useSessionStore'
import { formatCost } from '../../lib/format'

interface SessionSummaryCardProps {
  projectPath: string | undefined
}

export function SessionSummaryCard({ projectPath }: SessionSummaryCardProps) {
  const sessionsRecord = useSessionStore(s => s.sessions)

  const stats = useMemo(() => {
    const all = Object.values(sessionsRecord).filter(
      s => projectPath && s.projectPath === projectPath
    )
    let active = 0
    let waiting = 0
    let completed = 0
    let tokens = 0
    let cost = 0
    for (const s of all) {
      if (s.status === 'active' || s.status === 'starting') active++
      else if (s.status === 'waiting_for_input') waiting++
      else if (s.status === 'completed' || s.status === 'stopped') completed++
      tokens += s.tokenCount
      cost += s.estimatedCost
    }
    return { active, waiting, completed, total: all.length, tokens, cost }
  }, [sessionsRecord, projectPath])

  return (
    <div className="card p-4">
      <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
        Sessions
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active" value={stats.active} dot="bg-turbo-accent" />
        <Stat label="Waiting" value={stats.waiting} dot="bg-turbo-warning" />
        <Stat label="Done" value={stats.completed} dot="bg-turbo-success" />
      </div>
      {stats.total > 0 && (
        <div className="mt-3 pt-3 border-t border-turbo-border flex items-center gap-4 text-xs text-turbo-text-muted">
          <span>{stats.tokens.toLocaleString()} tokens</span>
          <span>{formatCost(stats.cost)}</span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[11px] text-turbo-text-muted">{label}</span>
      </div>
      <span className="text-lg font-semibold text-turbo-text">{value}</span>
    </div>
  )
}
