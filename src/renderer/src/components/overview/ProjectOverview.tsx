import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ProjectOverviewCard, type ProjectStats } from './ProjectOverviewCard'
import { WelcomeState } from '../command-center/CommandCenter'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { formatCost } from '../../lib/format'
import { stagger, fadeUp } from '../../lib/animations'
import type { AgentSession } from '../../../../shared/types/index'

export function ProjectOverview() {
  const projects = useProjectStore(s => s.projects)
  const selectProject = useProjectStore(s => s.selectProject)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)
  const sessionsRecord = useSessionStore(s => s.sessions)

  // Stable key for git branch fetching — only re-fetch when project list actually changes
  const projectKey = useMemo(
    () => projects.map(p => p.id).join(','),
    [projects]
  )

  // Git branches: fetch per project on mount / when project list changes
  const [gitBranches, setGitBranches] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchBranches() {
      const results = await Promise.allSettled(
        projects.map(async (p) => {
          const result = await window.api.gitExec({
            projectPath: p.path,
            commands: ['git rev-parse --abbrev-ref HEAD']
          })
          const step = result.steps[0]
          return { id: p.id, branch: result.success && step ? step.stdout.trim() : '' }
        })
      )
      if (cancelled) return
      const branches: Record<string, string> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.branch) {
          branches[r.value.id] = r.value.branch
        }
      }
      setGitBranches(branches)
    }
    if (projects.length > 0) fetchBranches()
    return () => { cancelled = true }
  }, [projectKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute per-project stats + aggregate in a single pass
  const { statsMap, latestMap, aggregate } = useMemo(() => {
    const stats: Record<string, ProjectStats> = {}
    const latest: Record<string, AgentSession> = {}

    // Build path -> project lookup for O(1) access
    const byPath = new Map<string, string>()
    for (const p of projects) {
      stats[p.id] = { active: 0, waiting: 0, completed: 0, tokens: 0, cost: 0 }
      byPath.set(p.path, p.id)
    }

    const sessions = Object.values(sessionsRecord)
    for (const s of sessions) {
      const projectId = byPath.get(s.projectPath)
      if (!projectId) continue
      const st = stats[projectId]
      if (s.status === 'active' || s.status === 'starting') st.active++
      else if (s.status === 'waiting_for_input') st.waiting++
      else if (s.status === 'completed' || s.status === 'stopped') st.completed++
      st.tokens += s.tokenCount
      st.cost += s.estimatedCost

      const prev = latest[projectId]
      if (!prev || s.startedAt > prev.startedAt) {
        latest[projectId] = s
      }
    }

    // Aggregate in the same memo — no need for a separate useMemo
    let active = 0, waiting = 0, completed = 0, cost = 0
    for (const st of Object.values(stats)) {
      active += st.active
      waiting += st.waiting
      completed += st.completed
      cost += st.cost
    }

    return {
      statsMap: stats,
      latestMap: latest,
      aggregate: { active, waiting, completed, cost }
    }
  }, [projects, sessionsRecord])

  // Empty state — reuse shared WelcomeState
  if (projects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6 py-4">
        <WelcomeState onAddProject={async () => {
          const folderPath = await window.api.openFolderDialog()
          if (folderPath) await addProjectFromPath(folderPath)
        }} />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-5xl w-full mx-auto"
      >
        {/* Header row */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6 mt-2">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-turbo-text">All Projects</h1>
            <div className="flex items-center gap-3 text-xs text-turbo-text-muted">
              {aggregate.active > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-turbo-accent" />
                  {aggregate.active} active
                </span>
              )}
              {aggregate.waiting > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-turbo-warning" />
                  {aggregate.waiting} waiting
                </span>
              )}
              {aggregate.completed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-turbo-success" />
                  {aggregate.completed} done
                </span>
              )}
              {aggregate.cost > 0 && (
                <span>{formatCost(aggregate.cost)}</span>
              )}
            </div>
          </div>
          <kbd className="kbd text-[10px]">Esc</kbd>
        </motion.div>

        {/* Project card grid */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {projects.map(project => (
            <ProjectOverviewCard
              key={project.id}
              project={project}
              stats={statsMap[project.id] || { active: 0, waiting: 0, completed: 0, tokens: 0, cost: 0 }}
              gitBranch={gitBranches[project.id] || null}
              latestSession={latestMap[project.id] || null}
              onSelect={() => selectProject(project.id)}
            />
          ))}
        </motion.div>

        {/* Footer hint */}
        <motion.p
          variants={fadeUp}
          className="text-[11px] text-turbo-text-muted text-center mt-8 mb-4"
        >
          Click a project to switch to it
        </motion.p>
      </motion.div>
    </div>
  )
}
