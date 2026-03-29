import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { parsePlan, type ParsedPlan } from '../lib/planParser'

interface UsePlanData {
  plan: ParsedPlan | null
  filePath: string | null
  lastModified: number
  loading: boolean
  found: boolean
  saving: boolean
  searchedPaths: string[]
  toggleCheckbox: (lineIndex: number) => void
  updateLine: (lineIndex: number, newContent: string) => void
  insertLine: (afterLineIndex: number, content: string) => void
  deleteLine: (lineIndex: number) => void
  updateBlock: (lineIndex: number, lineCount: number, newContent: string) => void
  refresh: () => Promise<void>
}

export function usePlanData(projectPath: string | undefined): UsePlanData {
  const [rawLines, setRawLines] = useState<string[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [lastModified, setLastModified] = useState(0)
  const [loading, setLoading] = useState(true)
  const [found, setFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchedPaths, setSearchedPaths] = useState<string[]>([])

  // Refs for synchronous access in callbacks (avoids stale closures)
  const rawLinesRef = useRef<string[]>([])
  const lastModifiedRef = useRef(0)
  const filePathRef = useRef<string | null>(null)
  const pathRef = useRef(projectPath)
  pathRef.current = projectPath
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchRef = useRef(0)

  // Derive plan from rawLines (eliminates manual synchronization)
  const plan = useMemo(
    () => rawLines.length > 0 ? parsePlan(rawLines.join('\n')) : null,
    [rawLines]
  )

  // Helper: update state + refs from a read result
  const applyReadResult = useCallback((result: {
    found: boolean; filePath: string | null; raw: string | null
    lastModified: number; searchedPaths: string[]
  }) => {
    setFound(result.found)
    setFilePath(result.filePath)
    filePathRef.current = result.filePath
    setLastModified(result.lastModified)
    lastModifiedRef.current = result.lastModified
    setSearchedPaths(result.searchedPaths)

    if (result.found && result.raw !== null) {
      const lines = result.raw.split('\n')
      rawLinesRef.current = lines
      setRawLines(lines)
    } else {
      rawLinesRef.current = []
      setRawLines([])
    }
  }, [])

  const fetchPlan = useCallback(async () => {
    if (!projectPath) {
      applyReadResult({ found: false, filePath: null, raw: null, lastModified: 0, searchedPaths: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await window.api.planRead(projectPath)
      if (pathRef.current !== projectPath) return
      applyReadResult(result)
    } catch {
      if (pathRef.current === projectPath) {
        setFound(false)
        rawLinesRef.current = []
        setRawLines([])
      }
    } finally {
      if (pathRef.current === projectPath) {
        setLoading(false)
        lastFetchRef.current = Date.now()
      }
    }
  }, [projectPath, applyReadResult])

  // Fetch on mount / project change
  useEffect(() => {
    dirtyRef.current = false
    fetchPlan()
  }, [fetchPlan])

  // Subscribe to external file changes
  useEffect(() => {
    const unsub = window.api.onPlanFileChanged((result) => {
      if (dirtyRef.current) return
      applyReadResult(result)
    })
    return unsub
  }, [applyReadResult])

  // Re-fetch on window focus (5s debounce)
  useEffect(() => {
    const handler = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetchRef.current > 5000 &&
        !dirtyRef.current
      ) {
        fetchPlan()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchPlan])

  // Debounced save — reads from refs to avoid stale closures
  const debounceSave = useCallback((lines: string[]) => {
    const fp = filePathRef.current
    if (!fp) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const result = await window.api.planSave({
          filePath: fp,
          content: lines.join('\n'),
          lastModified: lastModifiedRef.current
        })
        if (result.conflict) {
          dirtyRef.current = false
          fetchPlan()
        } else {
          lastModifiedRef.current = result.lastModified
          setLastModified(result.lastModified)
          dirtyRef.current = false
        }
      } catch {
        // Save failed
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [fetchPlan])

  // Core edit helper — no side effects inside state updater
  const applyEdit = useCallback((editFn: (lines: string[]) => string[]) => {
    const next = editFn([...rawLinesRef.current])
    rawLinesRef.current = next
    dirtyRef.current = true
    setRawLines(next)
    debounceSave(next)
  }, [debounceSave])

  const toggleCheckbox = useCallback((lineIndex: number) => {
    applyEdit(lines => {
      const line = lines[lineIndex]
      if (!line) return lines
      if (line.match(/- \[ \]/)) {
        lines[lineIndex] = line.replace('- [ ]', '- [x]')
      } else if (line.match(/- \[[xX]\]/)) {
        lines[lineIndex] = line.replace(/- \[[xX]\]/, '- [ ]')
      }
      return lines
    })
  }, [applyEdit])

  const updateLine = useCallback((lineIndex: number, newContent: string) => {
    applyEdit(lines => {
      if (lineIndex < 0 || lineIndex >= lines.length) return lines
      const line = lines[lineIndex]

      const headingMatch = line.match(/^(#{1,6}\s+)/)
      if (headingMatch) {
        lines[lineIndex] = headingMatch[1] + newContent
        return lines
      }

      const checkboxMatch = line.match(/^(\s*- \[[xX ]\]\s+)/)
      if (checkboxMatch) {
        lines[lineIndex] = checkboxMatch[1] + newContent
        return lines
      }

      const listMatch = line.match(/^(\s*- )/)
      if (listMatch) {
        lines[lineIndex] = listMatch[1] + newContent
        return lines
      }

      const bqMatch = line.match(/^(>\s?)/)
      if (bqMatch) {
        lines[lineIndex] = bqMatch[1] + newContent
        return lines
      }

      lines[lineIndex] = newContent
      return lines
    })
  }, [applyEdit])

  const insertLine = useCallback((afterLineIndex: number, content: string) => {
    applyEdit(lines => {
      lines.splice(afterLineIndex + 1, 0, content)
      return lines
    })
  }, [applyEdit])

  const deleteLine = useCallback((lineIndex: number) => {
    applyEdit(lines => {
      if (lineIndex < 0 || lineIndex >= lines.length) return lines
      lines.splice(lineIndex, 1)
      return lines
    })
  }, [applyEdit])

  const updateBlock = useCallback((lineIndex: number, lineCount: number, newContent: string) => {
    applyEdit(lines => {
      if (lineIndex < 0 || lineIndex >= lines.length) return lines
      const newLines = newContent.split('\n')
      lines.splice(lineIndex, lineCount, ...newLines)
      return lines
    })
  }, [applyEdit])

  return {
    plan,
    filePath,
    lastModified,
    loading,
    found,
    saving,
    searchedPaths,
    toggleCheckbox,
    updateLine,
    insertLine,
    deleteLine,
    updateBlock,
    refresh: fetchPlan
  }
}
