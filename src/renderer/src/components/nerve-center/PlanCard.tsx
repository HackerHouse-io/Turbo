import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { usePlanData } from '../../hooks/usePlanData'
import { PLAN_GENERATION_PROMPT } from '../plan/PlanEmptyState'

interface PlanCardProps {
  projectPath: string | undefined
}

export function PlanCard({ projectPath }: PlanCardProps) {
  const openPlanOverlay = useUIStore(s => s.openPlanOverlay)
  const { plan, found, loading, refresh } = usePlanData(projectPath)

  const handleCreate = useCallback(async () => {
    if (!projectPath) return
    await window.api.createSession({
      projectPath,
      prompt: PLAN_GENERATION_PROMPT,
      name: 'Generate PLAN.md',
      permissionMode: 'auto'
    })
  }, [projectPath])

  if (loading) return null

  // No PLAN.md — show create prompt
  if (!found || !plan) {
    return (
      <motion.button
        onClick={handleCreate}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className="w-full text-left bg-turbo-surface border border-dashed border-turbo-border rounded-xl px-4 py-3 hover:border-turbo-accent/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-turbo-accent/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-turbo-accent">
              <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-turbo-text">Generate PLAN.md</h3>
            <p className="text-[10px] text-turbo-text-muted">Analyze this project with Claude and create a roadmap</p>
          </div>
        </div>
      </motion.button>
    )
  }

  const progress = plan.totalTasks > 0 ? plan.completedTasks / plan.totalTasks : 0
  const progressPct = Math.round(progress * 100)
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const topSections = plan.sections.slice(0, 4)

  return (
    <motion.button
      onClick={openPlanOverlay}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className="w-full text-left bg-turbo-surface border border-turbo-border rounded-xl px-4 py-3 hover:border-turbo-accent/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
            <circle
              cx="20" cy="20" r={radius}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-turbo-border"
            />
            <circle
              cx="20" cy="20" r={radius}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-turbo-accent transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-turbo-text-dim">
            {progressPct}%
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-medium text-turbo-text">PLAN.md</h3>
            <span className="text-[10px] text-turbo-text-muted">
              {plan.completedTasks}/{plan.totalTasks} tasks
            </span>
          </div>

          {/* Section previews */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {topSections.map((section, i) => {
              const sProgress = section.totalTasks > 0
                ? section.completedTasks / section.totalTasks
                : 0
              const isComplete = section.totalTasks > 0 && section.completedTasks === section.totalTasks

              return (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className={isComplete ? 'text-emerald-400' : sProgress > 0 ? 'text-turbo-accent' : 'text-turbo-text-muted'}>
                    {isComplete ? '\u2713' : sProgress > 0 ? '\u25D0' : '\u25CB'}
                  </span>
                  <span className="text-turbo-text-dim truncate max-w-[120px]">
                    {section.heading.content}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Arrow */}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="text-turbo-text-muted group-hover:text-turbo-accent transition-colors flex-shrink-0"
        >
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </motion.button>
  )
}
