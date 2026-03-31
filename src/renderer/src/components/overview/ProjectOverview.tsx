import { useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectOverviewCard, type ProjectStats } from './ProjectOverviewCard'
import { AttentionFeedItem } from './AttentionFeedItem'
import { WelcomeState } from '../command-center/CommandCenter'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useOverviewData } from '../../hooks/useOverviewData'
import { formatCost, timeAgo } from '../../lib/format'
import { stagger, fadeUp } from '../../lib/animations'
import type { AgentSession, AttentionItem } from '../../../../shared/types/index'

const MAX_VISIBLE_ATTENTION = 5

export function ProjectOverview() {
  const projects = useProjectStore(s => s.projects)
  const selectProject = useProjectStore(s => s.selectProject)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const attentionItems = useSessionStore(s => s.attentionItems)

  const { data: overviewData, loading, lastUpdated, refresh } = useOverviewData(projects)

  const feedRef = useRef<HTMLDivElement>(null)
  const [showAllAttention, setShowAllAttention] = useState(false)

  // Compute per-project stats + aggregate in a single pass
  const { statsMap, latestMap, aggregate } = useMemo(() => {
    const stats: Record<string, ProjectStats> = {}
    const latest: Record<string, AgentSession> = {}

    const byPath = new Map<string, string>()
    for (const p of projects) {
      stats[p.id] = { active: 0, waiting: 0, completed: 0, tokens: 0, cost: 0 }
      byPath.set(p.path, p.id)
    }

    const sessions = Object.values(sessionsRecord)
    let totalErrors = 0
    for (const s of sessions) {
      const projectId = byPath.get(s.projectPath)
      if (!projectId) continue
      const st = stats[projectId]
      if (s.status === 'active' || s.status === 'starting') st.active++
      else if (s.status === 'waiting_for_input') st.waiting++
      else if (s.status === 'completed' || s.status === 'stopped') st.completed++
      else if (s.status === 'error') totalErrors++
      st.tokens += s.tokenCount
      st.cost += s.estimatedCost

      const prev = latest[projectId]
      if (!prev || s.startedAt > prev.startedAt) {
        latest[projectId] = s
      }
    }

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
      aggregate: { active, waiting, completed, errors: totalErrors, cost }
    }
  }, [projects, sessionsRecord])

  // Total attention count
  const totalAttention = useMemo(
    () => attentionItems.filter(i => !i.dismissed).length,
    [attentionItems]
  )

  // Sort projects by priority
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const oa = overviewData[a.id]
      const ob = overviewData[b.id]
      const aAttention = oa?.attentionCount ?? 0
      const bAttention = ob?.attentionCount ?? 0

      // 1. Projects with attention items first
      if (aAttention > 0 && bAttention === 0) return -1
      if (bAttention > 0 && aAttention === 0) return 1
      if (aAttention !== bAttention) return bAttention - aAttention

      const sa = statsMap[a.id]
      const sb = statsMap[b.id]

      // 2. Active sessions
      if (sa?.active && !sb?.active) return -1
      if (sb?.active && !sa?.active) return 1

      // 3. Waiting sessions
      if (sa?.waiting && !sb?.waiting) return -1
      if (sb?.waiting && !sa?.waiting) return 1

      // 4. Idle last
      const aIdle = !sa?.active && !sa?.waiting && !sa?.completed
      const bIdle = !sb?.active && !sb?.waiting && !sb?.completed
      if (aIdle && !bIdle) return 1
      if (bIdle && !aIdle) return -1

      // 5. Alphabetical
      return a.name.localeCompare(b.name)
    })
  }, [projects, overviewData, statsMap])

  // Cross-project attention feed: undismissed items with project attribution
  const feedItems = useMemo(() => {
    const byPath = new Map<string, typeof projects[0]>()
    for (const p of projects) byPath.set(p.path, p)

    // Map attention items to include project info
    const items: { item: AttentionItem; project: typeof projects[0] | undefined }[] = []
    for (const ai of attentionItems) {
      if (ai.dismissed) continue
      const session = sessionsRecord[ai.sessionId]
      const proj = session ? byPath.get(session.projectPath) : undefined
      items.push({ item: ai, project: proj })
    }

    // Sort by priority (error > stuck > decision > review > completed) then by timestamp
    const priorityOrder: Record<string, number> = { error: 0, stuck: 1, decision: 2, review: 3, completed: 4 }
    items.sort((a, b) => {
      const pa = priorityOrder[a.item.type] ?? 5
      const pb = priorityOrder[b.item.type] ?? 5
      if (pa !== pb) return pa - pb
      return b.item.timestamp - a.item.timestamp
    })

    return items
  }, [attentionItems, sessionsRecord, projects])

  const visibleFeedItems = showAllAttention ? feedItems : feedItems.slice(0, MAX_VISIBLE_ATTENTION)

  // Empty state
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
        {/* Enhanced header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6 mt-2">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-turbo-text">All Projects</h1>
            <span className="text-xs text-turbo-text-muted">{projects.length} projects</span>
            <div className="flex items-center gap-3 text-xs text-turbo-text-muted">
              {aggregate.active > 0 && (
                <Pill color="bg-turbo-accent" label={`${aggregate.active} active`} />
              )}
              {aggregate.waiting > 0 && (
                <Pill color="bg-turbo-warning" label={`${aggregate.waiting} waiting`} />
              )}
              {aggregate.errors > 0 && (
                <Pill color="bg-turbo-error" label={`${aggregate.errors} errors`} />
              )}
              {aggregate.completed > 0 && (
                <Pill color="bg-turbo-success" label={`${aggregate.completed} done`} />
              )}
              {aggregate.cost > 0 && (
                <span>{formatCost(aggregate.cost)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Total attention badge */}
            {totalAttention > 0 && (
              <button
                onClick={() => feedRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 text-xs text-turbo-error hover:opacity-80 transition-opacity"
              >
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px]
                                 font-bold rounded-full bg-turbo-error text-white">
                  {totalAttention}
                </span>
                <span>needs attention</span>
              </button>
            )}

            {/* Refresh + last updated */}
            <button
              onClick={refresh}
              disabled={loading}
              className="text-turbo-text-muted hover:text-turbo-text transition-colors disabled:opacity-50"
              title="Refresh overview data"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 8A6 6 0 1 1 8 2" strokeLinecap="round" />
                <path d="M8 0v4l3-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {lastUpdated > 0 && (
              <span className="text-[10px] text-turbo-text-muted">{timeAgo(lastUpdated)}</span>
            )}

            <kbd className="kbd text-[10px]">Esc</kbd>
          </div>
        </motion.div>

        {/* Project card grid — sorted by priority */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {sortedProjects.map(project => (
            <ProjectOverviewCard
              key={project.id}
              project={project}
              stats={statsMap[project.id] || { active: 0, waiting: 0, completed: 0, tokens: 0, cost: 0 }}
              latestSession={latestMap[project.id] || null}
              overviewData={overviewData[project.id]}
              onSelect={() => selectProject(project.id)}
            />
          ))}
        </motion.div>

        {/* Cross-project attention feed */}
        {feedItems.length > 0 && (
          <motion.div
            ref={feedRef}
            variants={fadeUp}
            className="mt-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-turbo-text">Needs Attention</h2>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px]
                               font-bold rounded-full bg-turbo-error/20 text-turbo-error">
                {feedItems.length}
              </span>
            </div>
            <div className="card divide-y divide-turbo-border overflow-hidden">
              <AnimatePresence mode="popLayout">
                {visibleFeedItems.map(({ item, project }) => (
                  <AttentionFeedItem key={item.id} item={item} project={project} />
                ))}
              </AnimatePresence>
            </div>
            {feedItems.length > MAX_VISIBLE_ATTENTION && (
              <button
                onClick={() => setShowAllAttention(!showAllAttention)}
                className="mt-2 text-xs text-turbo-text-muted hover:text-turbo-text transition-colors"
              >
                {showAllAttention ? 'Show less' : `Show all (${feedItems.length})`}
              </button>
            )}
          </motion.div>
        )}

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

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}
