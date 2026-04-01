import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSessionStore } from '../stores/useSessionStore'
import { usePlaybookStore } from '../stores/usePlaybookStore'
import { parsePlan } from '../lib/planParser'
import { parsePorcelainStatus } from '../lib/gitParsers'
import type { Project, PlaybookExecution } from '../../../shared/types'
import { isTerminalStatus } from '../../../shared/types'

export interface ProjectOverviewData {
  git: {
    branch: string
    dirty: number
    staged: number
  } | null
  plan: { totalTasks: number; completedTasks: number } | null
  attentionCount: number
  errorCount: number
  activePlaybook: {
    name: string
    currentStep: number
    totalSteps: number
  } | null
}

interface UseOverviewDataResult {
  data: Record<string, ProjectOverviewData>
  loading: boolean
  lastUpdated: number
  refresh: () => void
}

const POLL_INTERVAL = 30_000

export function useOverviewData(projects: Project[]): UseOverviewDataResult {
  const [data, setData] = useState<Record<string, ProjectOverviewData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(0)
  const projectKeyRef = useRef('')
  const lastFetchRef = useRef(0)
  const projectsRef = useRef(projects)
  projectsRef.current = projects

  // Derive attention + error counts from stores (reactive, no IPC needed)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const attentionItems = useSessionStore(s => s.attentionItems)
  const playbookExecutions = usePlaybookStore(s => s.executions)

  // Stable callback — reads projects from ref to avoid identity churn
  const fetchData = useCallback(async () => {
    const currentProjects = projectsRef.current
    if (currentProjects.length === 0) {
      setData({})
      setLoading(false)
      return
    }

    setLoading(true)
    lastFetchRef.current = Date.now()

    const results = await Promise.allSettled(
      currentProjects.map(async (p) => {
        const [statusRaw, branchResult, planResult] = await Promise.all([
          window.api.gitStatus(p.path),
          window.api.gitExec({ projectPath: p.path, commands: ['git rev-parse --abbrev-ref HEAD'] }),
          window.api.planRead(p.path)
        ])

        let git: ProjectOverviewData['git'] = null
        const branchStep = branchResult.steps[0]
        if (branchResult.success && branchStep && statusRaw.success) {
          const { dirty, staged } = parsePorcelainStatus(statusRaw.stdout)
          git = { branch: branchStep.stdout.trim(), dirty, staged }
        }

        let plan: ProjectOverviewData['plan'] = null
        if (planResult.found && planResult.raw) {
          const parsed = parsePlan(planResult.raw)
          if (parsed.totalTasks > 0) {
            plan = { totalTasks: parsed.totalTasks, completedTasks: parsed.completedTasks }
          }
        }

        return { id: p.id, git, plan }
      })
    )

    const next: Record<string, ProjectOverviewData> = {}
    for (const r of results) {
      if (r.status === 'fulfilled') {
        next[r.value.id] = {
          git: r.value.git,
          plan: r.value.plan,
          attentionCount: 0,
          errorCount: 0,
          activePlaybook: null
        }
      }
    }
    for (const p of currentProjects) {
      if (!next[p.id]) {
        next[p.id] = { git: null, plan: null, attentionCount: 0, errorCount: 0, activePlaybook: null }
      }
    }

    setData(next)
    setLoading(false)
    setLastUpdated(Date.now())
  }, []) // stable — reads projects from ref

  // Fetch on mount / when project list changes
  const projectKey = projects.map(p => p.id).join(',')
  useEffect(() => {
    if (projectKey !== projectKeyRef.current) {
      projectKeyRef.current = projectKey
      fetchData()
    }
  }, [projectKey, fetchData])

  // 30s polling — stable interval since fetchData identity never changes
  useEffect(() => {
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Visibility-change refresh (5s min gap)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 5000) {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchData])

  // Merge store-derived data (attention, errors, playbooks) into IPC-fetched data
  const merged = useMemo(
    () => mergeStoreData(data, projects, sessionsRecord, attentionItems, playbookExecutions),
    [data, projects, sessionsRecord, attentionItems, playbookExecutions]
  )

  return { data: merged, loading, lastUpdated, refresh: fetchData }
}

function playbookEqual(
  a: ProjectOverviewData['activePlaybook'],
  b: ProjectOverviewData['activePlaybook']
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.name === b.name && a.currentStep === b.currentStep && a.totalSteps === b.totalSteps
}

function mergeStoreData(
  base: Record<string, ProjectOverviewData>,
  projects: Project[],
  sessions: Record<string, { projectPath: string; status: string }>,
  attentionItems: { sessionId: string; dismissed: boolean }[],
  playbookExecutions: Record<string, PlaybookExecution>
): Record<string, ProjectOverviewData> {
  if (Object.keys(base).length === 0) return base

  const byPath = new Map<string, string>()
  for (const p of projects) byPath.set(p.path, p.id)

  // Count errors per project
  const errorCounts: Record<string, number> = {}
  for (const s of Object.values(sessions)) {
    const pid = byPath.get(s.projectPath)
    if (pid && s.status === 'error') {
      errorCounts[pid] = (errorCounts[pid] || 0) + 1
    }
  }

  // Count undismissed attention items per project
  const attentionCounts: Record<string, number> = {}
  for (const item of attentionItems) {
    if (item.dismissed) continue
    const session = sessions[item.sessionId]
    if (!session) continue
    const pid = byPath.get(session.projectPath)
    if (pid) {
      attentionCounts[pid] = (attentionCounts[pid] || 0) + 1
    }
  }

  // Find active playbook per project
  const activePlaybooks: Record<string, ProjectOverviewData['activePlaybook']> = {}
  for (const exec of Object.values(playbookExecutions)) {
    if (isTerminalStatus(exec.status)) continue
    const pid = byPath.get(exec.projectPath)
    if (pid && !activePlaybooks[pid]) {
      activePlaybooks[pid] = {
        name: exec.playbookName,
        currentStep: exec.currentStepIndex + 1,
        totalSteps: exec.steps.length
      }
    }
  }

  // Merge — only create new objects when values actually differ
  const result: Record<string, ProjectOverviewData> = {}
  for (const [id, entry] of Object.entries(base)) {
    const ac = attentionCounts[id] || 0
    const ec = errorCounts[id] || 0
    const ap = activePlaybooks[id] || null
    if (entry.attentionCount === ac && entry.errorCount === ec && playbookEqual(entry.activePlaybook, ap)) {
      result[id] = entry
    } else {
      result[id] = { ...entry, attentionCount: ac, errorCount: ec, activePlaybook: ap }
    }
  }
  return result
}
