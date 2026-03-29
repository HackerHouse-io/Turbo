import { motion } from 'framer-motion'
import { timeAgo, formatCost } from '../../lib/format'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { Project, AgentSession } from '../../../../shared/types/index'

export interface ProjectStats {
  active: number
  waiting: number
  completed: number
  tokens: number
  cost: number
}

interface ProjectOverviewCardProps {
  project: Project
  stats: ProjectStats
  gitBranch: string | null
  latestSession: AgentSession | null
  onSelect: () => void
}

export function ProjectOverviewCard({
  project,
  stats,
  gitBranch,
  latestSession,
  onSelect
}: ProjectOverviewCardProps) {
  const hasActive = stats.active > 0
  const hasWaiting = stats.waiting > 0
  const allDone = !hasActive && !hasWaiting && stats.completed > 0
  const isIdle = stats.active === 0 && stats.waiting === 0 && stats.completed === 0

  const borderClass = hasActive
    ? 'border-turbo-accent/50'
    : hasWaiting
      ? 'border-turbo-warning/50'
      : allDone
        ? 'border-turbo-success/40'
        : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={`card p-4 cursor-pointer group relative overflow-hidden ${borderClass}`}
    >
      {/* Active shimmer effect */}
      {hasActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-turbo-accent/5 to-transparent
                        animate-shimmer bg-[length:200%_100%] pointer-events-none" />
      )}

      {/* Header: project name + status dot */}
      <div className="flex items-center justify-between gap-2 mb-2 relative">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="text-sm font-medium text-turbo-text truncate">{project.name}</h3>
        </div>
        {!isIdle && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            hasActive ? 'bg-turbo-accent animate-pulse'
              : hasWaiting ? 'bg-turbo-warning'
                : 'bg-turbo-success'
          }`} />
        )}
      </div>

      {/* Git branch */}
      {gitBranch && (
        <div className="flex items-center gap-1.5 mb-3 relative">
          <PaletteIcon icon="git-branch" className="w-3 h-3 text-turbo-text-muted flex-shrink-0" />
          <span className="text-xs text-turbo-text-muted truncate">{gitBranch}</span>
        </div>
      )}

      {/* Session stats */}
      <div className="border-t border-turbo-border pt-3 mb-3 relative">
        <div className="flex items-center gap-4">
          <StatLabel label="Active" value={stats.active} dot="bg-turbo-accent" />
          <StatLabel label="Waiting" value={stats.waiting} dot="bg-turbo-warning" />
          <StatLabel label="Done" value={stats.completed} dot="bg-turbo-success" />
        </div>
      </div>

      {/* Latest session */}
      {latestSession ? (
        <div className="border-t border-turbo-border pt-3 relative">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-turbo-text-dim truncate flex-1">
              {latestSession.name}
            </span>
            <span className="text-[10px] text-turbo-text-muted flex-shrink-0">
              {timeAgo(latestSession.startedAt)}
            </span>
          </div>
          {(stats.tokens > 0 || stats.cost > 0) && (
            <div className="flex items-center gap-3 mt-1 text-[10px] text-turbo-text-muted">
              <span>{formatCost(stats.cost)} total</span>
              <span>{stats.tokens.toLocaleString()} tokens</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-turbo-border pt-3 relative">
          <span className="text-xs text-turbo-text-muted">No sessions yet</span>
        </div>
      )}
    </motion.div>
  )
}

function StatLabel({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[11px] text-turbo-text-muted">{label}</span>
      <span className="text-sm font-semibold text-turbo-text">{value}</span>
    </div>
  )
}
