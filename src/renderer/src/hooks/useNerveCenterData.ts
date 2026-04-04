import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitBranchInfo, GitCommitEntry } from '../../../shared/types'
import { parsePorcelainStatus, type GitFileEntry } from '../lib/gitParsers'

const POLL_INTERVAL = 3_000
const MIN_FETCH_GAP = 1_000

interface NerveCenterData {
  git: GitBranchInfo | null
  commits: GitCommitEntry[]
  changedFiles: GitFileEntry[]
  loading: boolean
  error: string | null
  refresh: () => void
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
        relativeTime: parts.slice(2).join('|')
      }
    })
}

export function useNerveCenterData(projectPath: string | undefined): NerveCenterData {
  const [git, setGit] = useState<GitBranchInfo | null>(null)
  const [commits, setCommits] = useState<GitCommitEntry[]>([])
  const [changedFiles, setChangedFiles] = useState<GitFileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathRef = useRef(projectPath)
  pathRef.current = projectPath
  const lastFetchRef = useRef(0)
  // Track raw git output to skip no-op updates
  const lastRawRef = useRef('')
  const initialRef = useRef(true)

  const fetchData = useCallback(async () => {
    if (!projectPath) {
      setGit(null)
      setCommits([])
      setChangedFiles([])
      setLoading(false)
      return
    }

    if (Date.now() - lastFetchRef.current < MIN_FETCH_GAP) return

    // Only show loading spinner on initial fetch, not background polls
    if (initialRef.current) setLoading(true)
    setError(null)
    lastFetchRef.current = Date.now()

    try {
      const [statusRaw, branch, logResult] = await Promise.all([
        window.api.gitStatus(projectPath),
        window.api.gitGetBranch(projectPath),
        window.api.gitExec({ projectPath, commands: ['git log --oneline -n 5 --format=%h|%s|%ar'] })
      ])

      if (pathRef.current !== projectPath) return

      if (!branch || !statusRaw.success) {
        setGit(null)
        setCommits([])
        setChangedFiles([])
        setError('Not a git repository')
        setLoading(false)
        return
      }

      // Skip all setState if raw data is identical to last poll
      const logStdout = logResult.success ? (logResult.steps[0]?.stdout ?? '') : ''
      const rawKey = `${statusRaw.stdout}\0${branch}\0${logStdout}`
      if (rawKey === lastRawRef.current) {
        if (initialRef.current) { initialRef.current = false; setLoading(false) }
        return
      }
      lastRawRef.current = rawKey

      const { dirty, staged, files } = parsePorcelainStatus(statusRaw.stdout)
      setGit({ branch, dirty, staged })
      setChangedFiles(files)
      setCommits(logStdout ? parseCommits(logStdout) : [])
    } catch {
      if (pathRef.current === projectPath) {
        setGit(null)
        setCommits([])
        setChangedFiles([])
        setError('Failed to fetch git data')
      }
    } finally {
      if (pathRef.current === projectPath) {
        initialRef.current = false
        setLoading(false)
      }
    }
  }, [projectPath])

  // Fetch on mount and when projectPath changes
  useEffect(() => {
    lastFetchRef.current = 0
    lastRawRef.current = ''
    initialRef.current = true
    fetchData()
  }, [fetchData])

  // Poll every 3s while mounted
  useEffect(() => {
    if (!projectPath) return
    const id = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [projectPath, fetchData])

  // Re-fetch on window focus (bypasses dedup)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        lastFetchRef.current = 0
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchData])

  return { git, commits, changedFiles, loading, error, refresh: fetchData }
}
