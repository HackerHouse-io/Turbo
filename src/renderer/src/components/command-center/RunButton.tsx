import { useState, useEffect, useCallback, useRef } from 'react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useUIStore } from '../../stores/useUIStore'
import { runInTerminalDrawer } from '../../lib/runInTerminalDrawer'

interface RunButtonProps {
  projectPath: string | undefined
}

export function RunButton({ projectPath }: RunButtonProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editCommand, setEditCommand] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Abort guard: increments on project switch or unmount to discard stale async results
  const generationRef = useRef(0)
  // Prevent double-click spawning duplicate terminals
  const launchingRef = useRef(false)

  // Narrow selectors — only re-render when this project's data changes
  const runTerminalId = useTerminalStore(s => projectPath ? s.runTerminals[projectPath] : undefined)
  const runTerminalAlive = useTerminalStore(s => runTerminalId ? !!s.terminals[runTerminalId] : false)
  const setRunTerminal = useTerminalStore(s => s.setRunTerminal)
  const clearRunTerminal = useTerminalStore(s => s.clearRunTerminal)
  const openPlainTerminalDrawer = useUIStore(s => s.openPlainTerminalDrawer)
  const refreshProjects = useProjectStore(s => s.refreshProjects)

  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const project = useProjectStore(s => s.projects.find(p => p.id === s.selectedProjectId))

  const isRunning = !!runTerminalId && runTerminalAlive

  // Clean up stale run terminal references (terminal was killed externally)
  useEffect(() => {
    if (runTerminalId && !runTerminalAlive && projectPath) {
      clearRunTerminal(projectPath)
    }
  }, [runTerminalId, runTerminalAlive, projectPath, clearRunTerminal])

  // Reset state when project changes
  useEffect(() => {
    generationRef.current++
    launchingRef.current = false
    setIsDetecting(false)
    setEditOpen(false)
  }, [projectPath])

  // Listen for terminal exits to clear run state
  useEffect(() => {
    const unsub = window.api.onPlainTerminalExit((terminalId: string) => {
      if (!projectPath) return
      const current = useTerminalStore.getState().runTerminals[projectPath]
      if (current === terminalId) {
        clearRunTerminal(projectPath)
        launchingRef.current = false
      }
    })
    return () => {
      unsub()
      generationRef.current++
    }
  }, [projectPath, clearRunTerminal])

  // Focus input when edit opens
  useEffect(() => {
    if (editOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editOpen])

  const launchCommand = useCallback(async (command: string, gen: number) => {
    if (!projectPath || launchingRef.current || gen !== generationRef.current) return

    launchingRef.current = true
    try {
      const terminalId = await runInTerminalDrawer(projectPath, command)
      if (gen !== generationRef.current || !terminalId) {
        launchingRef.current = false
        return
      }
      setRunTerminal(projectPath, terminalId)
    } catch {
      launchingRef.current = false
    }
  }, [projectPath, setRunTerminal])

  const handleRun = useCallback(async () => {
    if (!projectPath || !project) return
    const gen = generationRef.current

    // Already running — re-open the drawer
    if (isRunning && runTerminalId) {
      openPlainTerminalDrawer(runTerminalId)
      return
    }

    // Already detecting or launching — ignore
    if (isDetecting || launchingRef.current) return

    // Check for cached command
    if (project.runCommand) {
      const source = project.runCommandSource

      // File-based source: re-detect to check for changes
      if (source && source !== 'claude' && source !== 'user') {
        setIsDetecting(true)
        try {
          const fresh = await window.api.detectRunCommand(projectPath)
          if (gen !== generationRef.current) return
          if (fresh && fresh.command !== project.runCommand) {
            await window.api.setProjectRunCommand(project.id, fresh.command, fresh.source, fresh.sourceMtime)
            await refreshProjects()
            if (gen !== generationRef.current) return
            setIsDetecting(false)
            launchCommand(fresh.command, gen)
            return
          }
        } catch { /* use cached */ }
        if (gen !== generationRef.current) return
        setIsDetecting(false)
      }

      launchCommand(project.runCommand, gen)
      return
    }

    // No cache — detect
    setIsDetecting(true)
    try {
      const result = await window.api.detectRunCommand(projectPath)
      if (gen !== generationRef.current) return

      if (result) {
        await window.api.setProjectRunCommand(project.id, result.command, result.source, result.sourceMtime)
        await refreshProjects()
        if (gen !== generationRef.current) return
        setIsDetecting(false)

        // Claude-detected: show for user confirmation before first run
        if (result.source === 'claude') {
          setEditCommand(result.command)
          setEditOpen(true)
        } else {
          launchCommand(result.command, gen)
        }
      } else {
        setIsDetecting(false)
        setEditCommand('')
        setEditOpen(true)
      }
    } catch {
      if (gen === generationRef.current) {
        setIsDetecting(false)
        setEditCommand('')
        setEditOpen(true)
      }
    }
  }, [projectPath, project, isRunning, runTerminalId, isDetecting, openPlainTerminalDrawer, refreshProjects, launchCommand])

  const handleStop = useCallback(async () => {
    if (!runTerminalId) return
    try { await window.api.killPlainTerminal(runTerminalId) } catch { /* already dead */ }
    if (projectPath) clearRunTerminal(projectPath)
    launchingRef.current = false
  }, [runTerminalId, projectPath, clearRunTerminal])

  const handleSaveAndRun = useCallback(async () => {
    if (!editCommand.trim() || !project || !projectPath) return
    const cmd = editCommand.trim()
    const gen = generationRef.current

    await window.api.setProjectRunCommand(project.id, cmd, 'user', undefined)
    await refreshProjects()
    if (gen !== generationRef.current) return
    setEditOpen(false)
    launchCommand(cmd, gen)
  }, [editCommand, project, projectPath, refreshProjects, launchCommand])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setEditCommand(project?.runCommand || '')
    setEditOpen(true)
  }, [project])

  if (!projectPath) return null

  return (
    <div className="relative">
      {isRunning ? (
        <button
          onClick={handleStop}
          onContextMenu={handleContextMenu}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                     bg-red-500/15 text-red-400 border border-red-500/30
                     hover:bg-red-500/25 transition-colors"
          title="Stop (right-click to edit command)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="8" height="8" rx="1" />
          </svg>
          Stop
        </button>
      ) : (
        <button
          onClick={handleRun}
          onContextMenu={handleContextMenu}
          disabled={isDetecting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                     bg-emerald-500/15 text-emerald-400 border border-emerald-500/30
                     hover:bg-emerald-500/25 transition-colors
                     disabled:opacity-50 disabled:cursor-wait"
          title="Run project (right-click to edit command)"
        >
          {isDetecting ? (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" className="animate-spin">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="12 8" />
              </svg>
              Detecting...
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <polygon points="2,1 9,5 2,9" />
              </svg>
              Run
            </>
          )}
        </button>
      )}

      {editOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-72 p-3 rounded-lg border border-turbo-border bg-turbo-surface shadow-xl">
            <label className="block text-xs text-turbo-text-muted mb-1.5">Run command</label>
            <input
              ref={inputRef}
              type="text"
              value={editCommand}
              onChange={e => setEditCommand(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveAndRun()
                if (e.key === 'Escape') setEditOpen(false)
              }}
              placeholder="npm run dev"
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-turbo-bg border border-turbo-border text-turbo-text
                         placeholder:text-turbo-text-muted focus:outline-none focus:border-turbo-accent"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-2.5 py-1 text-xs text-turbo-text-muted hover:text-turbo-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndRun}
                disabled={!editCommand.trim()}
                className="px-2.5 py-1 text-xs rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30
                           hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                Save & Run
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
