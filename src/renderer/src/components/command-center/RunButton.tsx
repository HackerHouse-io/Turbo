import { useState, useEffect, useCallback, useRef } from 'react'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useUIStore } from '../../stores/useUIStore'
import { shellQuote } from '../../lib/format'

interface RunButtonProps {
  projectPath: string | undefined
}

const RUN_PROMPT = [
  'Analyze this project and run it in development mode. Follow these rules:',
  '- For iOS/macOS apps (.xcodeproj, .xcworkspace): build with xcodebuild and launch the iOS Simulator',
  '- For React Native: use npx react-native run-ios or run-android',
  '- For Flutter: use flutter run',
  '- For web/Node.js projects: install deps if needed, then start the dev server (npm run dev, npm start, etc.)',
  '- For Python projects: activate venv if present, install deps, run the main entry point',
  '- For Go/Rust/C++ projects: build and run',
  '- For Docker projects: docker compose up',
  '- If there are multiple runnable targets, pick the most common dev workflow',
  '- Do NOT ask me questions, just run it',
].join(' ')

const CLAUDE_CMD = `claude --permission-mode auto --model sonnet --effort medium ${shellQuote(RUN_PROMPT)}`

export function RunButton({ projectPath }: RunButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false)
  const generationRef = useRef(0)
  const launchingRef = useRef(false)
  const sendTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const runTerminalId = useTerminalStore(s => projectPath ? s.runTerminals[projectPath] : undefined)
  const runTerminalAlive = useTerminalStore(s => runTerminalId ? !!s.terminals[runTerminalId] : false)
  const setRunTerminal = useTerminalStore(s => s.setRunTerminal)
  const clearRunTerminal = useTerminalStore(s => s.clearRunTerminal)
  const openPlainTerminalDrawer = useUIStore(s => s.openPlainTerminalDrawer)

  const isRunning = !!runTerminalId && runTerminalAlive

  // Clean up stale run terminal references
  useEffect(() => {
    if (runTerminalId && !runTerminalAlive && projectPath) {
      clearRunTerminal(projectPath)
    }
  }, [runTerminalId, runTerminalAlive, projectPath, clearRunTerminal])

  // Reset on project switch
  useEffect(() => {
    generationRef.current++
    launchingRef.current = false
    setIsLaunching(false)
    return () => { clearTimeout(sendTimerRef.current) }
  }, [projectPath])

  // Listen for terminal exits to reset launch guard
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

  const handleRun = useCallback(async () => {
    if (!projectPath) return

    if (isRunning && runTerminalId) {
      openPlainTerminalDrawer(runTerminalId)
      return
    }

    if (launchingRef.current) return
    launchingRef.current = true
    setIsLaunching(true)

    const gen = ++generationRef.current

    try {
      const terminal = await window.api.createPlainTerminal({ projectPath, type: 'shell' })
      if (!terminal || gen !== generationRef.current) {
        launchingRef.current = false
        setIsLaunching(false)
        return
      }

      useTerminalStore.getState().addTerminal(terminal)
      setRunTerminal(projectPath, terminal.id)
      openPlainTerminalDrawer(terminal.id)

      // Wait for shell init before sending the command
      sendTimerRef.current = setTimeout(() => {
        window.api.sendPlainTerminalInput(terminal.id, CLAUDE_CMD + '\n')
      }, 400)
    } catch (err) {
      console.error('RunButton: failed to create terminal', err)
    } finally {
      if (gen === generationRef.current) {
        launchingRef.current = false
        setIsLaunching(false)
      }
    }
  }, [projectPath, isRunning, runTerminalId, openPlainTerminalDrawer, setRunTerminal])

  const handleStop = useCallback(async () => {
    if (!runTerminalId) return
    clearTimeout(sendTimerRef.current)
    try { await window.api.killPlainTerminal(runTerminalId) } catch { /* already dead */ }
    if (projectPath) clearRunTerminal(projectPath)
    launchingRef.current = false
  }, [runTerminalId, projectPath, clearRunTerminal])

  if (!projectPath) return null

  if (isRunning) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => runTerminalId && openPlainTerminalDrawer(runTerminalId)}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-l-lg text-xs font-medium
                     bg-emerald-500/10 text-emerald-400 border border-emerald-500/25
                     hover:bg-emerald-500/20 transition-colors cursor-pointer"
          title="Show running terminal"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Running
        </button>
        <button
          onClick={handleStop}
          className="inline-flex items-center px-1.5 py-1.5 rounded-r-lg text-xs font-medium
                     bg-red-500/10 text-red-400 border border-red-500/25 border-l-0
                     hover:bg-red-500/20 transition-colors cursor-pointer"
          title="Stop"
        >
          <svg className="w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
            <rect x="2" y="2" width="6" height="6" rx="0.5" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleRun}
      disabled={isLaunching}
      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
                 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25
                 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors cursor-pointer
                 disabled:opacity-50 disabled:cursor-wait"
      title="Run project with Claude"
    >
      {isLaunching ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="8" cy="8" r="6" strokeDasharray="20 12" />
          </svg>
          <span>Starting...</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <polygon points="4,2 13,8 4,14" />
          </svg>
          <span>Run</span>
        </>
      )}
    </button>
  )
}
