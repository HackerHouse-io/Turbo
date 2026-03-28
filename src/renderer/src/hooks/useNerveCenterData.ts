import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitBranchInfo, GitCommitEntry } from '../../../shared/types'

interface NerveCenterData {
  git: GitBranchInfo | null
  commits: GitCommitEntry[]
  loading: boolean
  error: string | null
  refresh: () => void
}

function parsePorcelainStatus(raw: string): { dirty: number; staged: number } {
  let dirty = 0
  let staged = 0
  for (const line of raw.split('\n')) {
    if (line.length < 2) continue
    const index = line[0]
    const worktree = line[1]
    // Staged: index column has a letter (not space or ?)
    if (index !== ' ' && index !== '?') staged++
    // Dirty: worktree column has a letter, or untracked (??)
    if (worktree !== ' ' && worktree !== '?') dirty++
    if (line.startsWith('??')) dirty++
  }
  return { dirty, staged }
}

function parseCommits(raw: string): GitCommitEntry[] {
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|')
      return {
        hash: parts[0] ?? '',
        message: parts[1] ?? '',
        relativeTime: parts.slice(2).join('|') // safe if message had |
      }
    })
}

export function useNerveCenterData(projectPath: string | undefined): NerveCenterData {
  const [git, setGit] = useState<GitBranchInfo | null>(null)
  const [commits, setCommits] = useState<GitCommitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathRef = useRef(projectPath)
  pathRef.current = projectPath
  const lastFetchRef = useRef(0)

  const fetchData = useCallback(async () => {
    if (!projectPath) {
      setGit(null)
      setCommits([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    lastFetchRef.current = Date.now()

    try {
      const [statusRaw, branchResult, logResult] = await Promise.all([
        window.api.gitStatus(projectPath),
        window.api.gitExec({ projectPath, commands: ['git rev-parse --abbrev-ref HEAD'] }),
        window.api.gitExec({ projectPath, commands: ['git log --oneline -n 5 --format=%h|%s|%ar'] })
      ])

      // Bail if project changed during fetch
      if (pathRef.current !== projectPath) return

      const branchStep = branchResult.steps[0]
      if (!branchResult.success || !branchStep) {
        setGit(null)
        setCommits([])
        setError('Not a git repository')
        setLoading(false)
        return
      }

      const { dirty, staged } = parsePorcelainStatus(statusRaw)
      setGit({
        branch: branchStep.stdout.trim(),
        dirty,
        staged
      })

      const logStep = logResult.steps[0]
      setCommits(logStep?.stdout ? parseCommits(logStep.stdout) : [])
    } catch {
      if (pathRef.current === projectPath) {
        setGit(null)
        setCommits([])
        setError('Failed to fetch git data')
      }
    } finally {
      if (pathRef.current === projectPath) {
        setLoading(false)
      }
    }
  }, [projectPath])

  // Fetch on mount and when projectPath changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Re-fetch on window focus (min 5s gap to avoid rapid refetches)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 5000) {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchData])

  return { git, commits, loading, error, refresh: fetchData }
}
