import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { timeAgo, formatCost } from '../../lib/format'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useConfirmAction } from '../../hooks/useConfirmAction'
import type { Project, AgentSession } from '../../../../shared/types/index'
import type { ProjectOverviewData } from '../../hooks/useOverviewData'

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
  latestSession: AgentSession | null
  overviewData: ProjectOverviewData | undefined
  onSelect: () => void
  onRemove: () => void
}

export const ProjectOverviewCard = React.memo(function ProjectOverviewCard({
  project,
  stats,
  latestSession,
  overviewData,
  onSelect,
  onRemove
}: ProjectOverviewCardProps) {
  const { armed, trigger: armRemove, reset: cancelRemove } = useConfirmAction(onRemove)
  const hasActive = stats.active > 0
  const hasWaiting = stats.waiting > 0
  const allDone = !hasActive && !hasWaiting && stats.completed > 0
  const isIdle = stats.active === 0 && stats.waiting === 0 && stats.completed === 0

  const attentionCount = overviewData?.attentionCount ?? 0
  const errorCount = overviewData?.errorCount ?? 0
  const git = overviewData?.git ?? null
  const plan = overviewData?.plan ?? null
  const activePlaybook = overviewData?.activePlaybook ?? null

  const borderClass = attentionCount > 0
    ? 'border-turbo-error/50'
    : hasActive
      ? 'border-turbo-accent/50'
      : hasWaiting
        ? 'border-turbo-warning/50'
        : allDone
          ? 'border-turbo-success/40'
          : ''

  // Plan progress ring calculations
  const planProgress = plan && plan.totalTasks > 0
    ? plan.completedTasks / plan.totalTasks
    : null
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = planProgress !== null ? circumference * (1 - planProgress) : circumference

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

      {/* Header: project name + status dot + attention badge */}
      <div className="flex items-center justify-between gap-2 mb-2 relative">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="text-sm font-medium text-turbo-text truncate">{project.name}</h3>
          {attentionCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px]
                             font-bold rounded-full bg-turbo-error text-white flex-shrink-0">
              {attentionCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); armRemove() }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-all ${
              armed
                ? 'opacity-100 text-turbo-error hover:bg-turbo-error/20'
                : 'opacity-0 group-hover:opacity-100 text-turbo-text-muted hover:text-turbo-error hover:bg-turbo-error/10'
            }`}
            title="Remove project from Turbo"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
          {!isIdle && (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              hasActive ? 'bg-turbo-accent animate-pulse'
                : hasWaiting ? 'bg-turbo-warning'
                  : 'bg-turbo-success'
            }`} />
          )}
        </div>
      </div>

      {/* Remove confirmation bar */}
      <AnimatePresence>
        {armed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden relative"
          >
            <div className="flex items-center justify-between gap-2 py-2 mb-2 border-b border-turbo-error/20">
              <span className="text-xs text-turbo-text-muted">
                Remove from Turbo? Files won't be deleted.
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); cancelRemove() }}
                  className="px-2 py-0.5 text-[11px] rounded text-turbo-text-muted hover:text-turbo-text
                             hover:bg-turbo-border/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); armRemove() }}
                  className="px-2 py-0.5 text-[11px] rounded font-medium text-white bg-turbo-error
                             hover:bg-turbo-error/80 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Git branch + dirty/staged */}
      {git?.branch && (
        <div className="flex items-center gap-1.5 mb-3 relative">
          <PaletteIcon icon="git-branch" className="w-3 h-3 text-turbo-text-muted flex-shrink-0" />
          <span className="text-xs text-turbo-text-muted truncate">{git.branch}</span>
          {git && git.dirty > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-turbo-text-muted flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {git.dirty}
            </span>
          )}
          {git && git.staged > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-turbo-text-muted flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {git.staged}
            </span>
          )}
        </div>
      )}

      {/* Plan progress row */}
      {planProgress !== null && plan && (
        <div className="flex items-center gap-2 mb-3 relative">
          <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90 flex-shrink-0">
            <circle
              cx="10" cy="10" r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-turbo-border"
            />
            <circle
              cx="10" cy="10" r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-turbo-accent transition-all duration-500"
            />
          </svg>
          <span className="text-xs text-turbo-text-muted">
            {plan.completedTasks}/{plan.totalTasks} tasks
          </span>
        </div>
      )}

      {/* Session stats */}
      <div className="border-t border-turbo-border pt-3 mb-3 relative">
        <div className="flex items-center gap-4">
          <StatLabel label="Active" value={stats.active} dot="bg-turbo-accent" />
          <StatLabel label="Waiting" value={stats.waiting} dot="bg-turbo-warning" />
          <StatLabel label="Done" value={stats.completed} dot="bg-turbo-success" />
          {errorCount > 0 && (
            <StatLabel label="Error" value={errorCount} dot="bg-turbo-error" />
          )}
        </div>
      </div>

      {/* Active playbook */}
      {activePlaybook && (
        <div className="flex items-center gap-1.5 mb-3 relative">
          <PaletteIcon icon="playbook" className="w-3 h-3 text-turbo-accent flex-shrink-0" />
          <span className="text-xs text-turbo-text-dim truncate">{activePlaybook.name}</span>
          <span className="text-[10px] text-turbo-text-muted flex-shrink-0">
            {activePlaybook.currentStep}/{activePlaybook.totalSteps}
          </span>
        </div>
      )}

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
})

function StatLabel({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[11px] text-turbo-text-muted">{label}</span>
      <span className="text-sm font-semibold text-turbo-text">{value}</span>
    </div>
  )
}
