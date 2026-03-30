import { useMemo } from 'react'
import { useSessionStore } from '../../stores/useSessionStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'
import { useUIStore } from '../../stores/useUIStore'
import { useNerveCenterData } from '../../hooks/useNerveCenterData'
import { usePlanData } from '../../hooks/usePlanData'
import { formatCost } from '../../lib/format'
import { BranchSwitcher } from './BranchSwitcher'
import { PaletteIcon } from '../command-palette/PaletteIcon'

interface StatusStripProps {
  projectPath: string | undefined
}

export function StatusStrip({ projectPath }: StatusStripProps) {
  const sessionsRecord = useSessionStore(s => s.sessions)
  const playbookExecutions = usePlaybookStore(s => s.executions)
  const openPlanOverlay = useUIStore(s => s.openPlanOverlay)

  const { git, refresh } = useNerveCenterData(projectPath)
  const { plan, found } = usePlanData(projectPath)

  // Session counts filtered by project
  const stats = useMemo(() => {
    const all = Object.values(sessionsRecord).filter(
      s => projectPath && s.projectPath === projectPath
    )
    let active = 0
    let waiting = 0
    let error = 0
    let done = 0
    let tokens = 0
    let cost = 0
    for (const s of all) {
      if (s.status === 'active' || s.status === 'starting') active++
      else if (s.status === 'waiting_for_input') waiting++
      else if (s.status === 'error') error++
      else if (s.status === 'completed' || s.status === 'stopped') done++
      tokens += s.tokenCount
      cost += s.estimatedCost
    }
    return { active, waiting, error, done, tokens, cost }
  }, [sessionsRecord, projectPath])

  // Active playbook for this project
  const activePlaybook = useMemo(() => {
    const all = Object.values(playbookExecutions)
    return all.find(r =>
      r.status !== 'completed' && r.status !== 'stopped' && r.status !== 'failed' &&
      (!projectPath || r.projectPath === projectPath)
    )
  }, [playbookExecutions, projectPath])

  // Plan progress ring
  const planProgress = found && plan && plan.totalTasks > 0
    ? plan.completedTasks / plan.totalTasks
    : null
  const planPct = planProgress !== null ? Math.round(planProgress * 100) : 0
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = planProgress !== null ? circumference * (1 - planProgress) : circumference

  return (
    <div className="h-9 flex items-center justify-between gap-4 px-4 border-b border-turbo-border bg-turbo-surface/30 text-xs flex-shrink-0">
      {/* Left: session count pills */}
      <div className="flex items-center gap-3">
        {stats.active > 0 && (
          <Pill color="bg-turbo-accent" label={`${stats.active} active`} pulse />
        )}
        {stats.waiting > 0 && (
          <Pill color="bg-turbo-warning" label={`${stats.waiting} waiting`} pulse />
        )}
        {stats.error > 0 && (
          <Pill color="bg-turbo-error" label={`${stats.error} error`} />
        )}
        {stats.done > 0 && (
          <Pill color="bg-turbo-success" label={`${stats.done} done`} />
        )}
        {stats.active === 0 && stats.waiting === 0 && stats.error === 0 && stats.done === 0 && (
          <span className="text-turbo-text-muted">Ready</span>
        )}
      </div>

      {/* Right: contextual info */}
      <div className="flex items-center gap-3">
        {/* Token/cost summary */}
        {stats.tokens > 0 && (
          <span className="text-turbo-text-muted">
            {stats.tokens.toLocaleString()} tokens · {formatCost(stats.cost)}
          </span>
        )}

        {/* Active playbook pill */}
        {activePlaybook && (
          <button
            onClick={() => {/* playbook detail is opened from list */}}
            className="inline-flex items-center gap-1.5 text-turbo-text-dim hover:text-turbo-text transition-colors"
          >
            <PaletteIcon icon="playbook" className="w-3 h-3 text-turbo-accent" />
            <span className="truncate max-w-[120px]">{activePlaybook.playbookName}</span>
            <span className="text-turbo-text-muted">
              {activePlaybook.currentStepIndex + 1}/{activePlaybook.steps.length}
            </span>
          </button>
        )}

        {/* Plan progress ring */}
        {planProgress !== null && (
          <button
            onClick={openPlanOverlay}
            className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            title={`Plan: ${planPct}% complete`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
              <circle
                cx="12" cy="12" r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-turbo-border"
              />
              <circle
                cx="12" cy="12" r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-turbo-accent transition-all duration-500"
              />
            </svg>
            <span className="text-turbo-text-muted">{planPct}%</span>
          </button>
        )}

        {/* Git info */}
        {git && (
          <div className="flex items-center gap-2">
            <BranchSwitcher
              projectPath={projectPath!}
              branch={git.branch}
              onRefresh={refresh}
            />
            {git.dirty > 0 && (
              <span className="inline-flex items-center gap-1 text-turbo-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {git.dirty}
              </span>
            )}
            {git.staged > 0 && (
              <span className="inline-flex items-center gap-1 text-turbo-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {git.staged}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-turbo-text-dim">
      <span className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
