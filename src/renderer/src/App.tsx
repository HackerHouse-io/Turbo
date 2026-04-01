import { useEffect, useRef, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useSessionStore } from './stores/useSessionStore'
import { useProjectStore } from './stores/useProjectStore'
import { useGitIdentityStore } from './stores/useGitIdentityStore'
import { usePlaybookStore } from './stores/usePlaybookStore'
import { useTerminalStore } from './stores/useTerminalStore'
import { useUIStore } from './stores/useUIStore'
import { useKeybindingsStore } from './stores/useKeybindingsStore'
import { useNotificationStore } from './stores/useNotificationStore'
import { useGitHubStore } from './stores/useGitHubStore'
import { appendTerminalData, clearTerminalBuffer } from './lib/terminalBuffer'
import { clearDrawerTerminal } from './lib/runInTerminalDrawer'

export default function App() {
  const updateSession = useSessionStore(s => s.updateSession)
  const addAttentionItem = useSessionStore(s => s.addAttentionItem)
  const removeSession = useSessionStore(s => s.removeSession)

  // Throttle refreshProjects — session-updated fires very frequently
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttledRefreshProjects = useCallback(() => {
    if (refreshTimerRef.current) return
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null
      useProjectStore.getState().refreshProjects()
    }, 2000)
  }, [])

  useEffect(() => {
    if (!window.api) {
      console.error('window.api is not available')
      return
    }

    // Initialize project store + git identity + keybindings + notification settings
    useProjectStore.getState().initialize()
    useGitIdentityStore.getState().initialize()
    useKeybindingsStore.getState().initialize()
    useNotificationStore.getState().loadSettings()
    useGitHubStore.getState().initialize()

    // Buffer all terminal data globally so XTermRenderer can replay on mount
    const unsubTerminal = window.api.onTerminalData((sessionId, data) => {
      appendTerminalData(sessionId, data)
    })

    // Buffer plain terminal data the same way
    const unsubPlainTerminal = window.api.onPlainTerminalData((terminalId, data) => {
      appendTerminalData(terminalId, data)
    })
    const unsubPlainTerminalExit = window.api.onPlainTerminalExit((terminalId) => {
      clearTerminalBuffer(terminalId)
    })

    const unsubPlainTerminalCreated = window.api.onPlainTerminalCreated((terminal) => {
      useTerminalStore.getState().addTerminal(terminal)
    })

    const unsubPlainTerminalRemoved = window.api.onPlainTerminalRemoved((terminalId) => {
      useTerminalStore.getState().removeTerminal(terminalId)
      clearDrawerTerminal(terminalId)
    })

    const unsubSession = window.api.onSessionUpdated((session) => {
      updateSession(session)
      // Refresh projects to update activeAgents counts (debounced)
      throttledRefreshProjects()
    })

    const unsubAttention = window.api.onAttentionNeeded((item) => {
      addAttentionItem(item)
      useNotificationStore.getState().showToast(item)
    })

    const unsubRemoved = window.api.onSessionRemoved((sessionId) => {
      removeSession(sessionId)
      clearTerminalBuffer(sessionId)
    })

    const unsubPlaybook = window.api.onPlaybookUpdated((execution) => {
      usePlaybookStore.getState().updateExecution(execution)
    })

    const unsubNotifClick = window.api.onNotificationClick((sessionId) => {
      useSessionStore.getState().selectSession(sessionId)
      useUIStore.getState().setViewMode('detail')
    })

    window.api.listSessions().then((sessions) => {
      useSessionStore.getState().setSessions(sessions)
    })

    window.api.listPlainTerminals().then((terminals) => {
      useTerminalStore.getState().setTerminals(terminals)
    })

    window.api.listPlaybookExecutions().then((executions) => {
      usePlaybookStore.getState().setExecutions(executions)
    })

    usePlaybookStore.getState().loadPlaybooks()

    return () => {
      unsubTerminal()
      unsubPlainTerminal()
      unsubPlainTerminalExit()
      unsubPlainTerminalCreated()
      unsubPlainTerminalRemoved()
      unsubSession()
      unsubAttention()
      unsubRemoved()
      unsubPlaybook()
      unsubNotifClick()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [updateSession, addAttentionItem, removeSession, throttledRefreshProjects])

  // Re-resolve git identity when project changes
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  useEffect(() => {
    const project = projects.find(p => p.id === selectedProjectId)
    if (project?.path) {
      useGitIdentityStore.getState().resolveForProject(project.path)
    }
  }, [selectedProjectId, projects])

  return <AppShell />
}
