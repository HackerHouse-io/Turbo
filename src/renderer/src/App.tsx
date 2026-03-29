import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useSessionStore } from './stores/useSessionStore'
import { useProjectStore } from './stores/useProjectStore'
import { useGitIdentityStore } from './stores/useGitIdentityStore'
import { useRoutineStore } from './stores/useRoutineStore'
import { appendTerminalData, clearTerminalBuffer } from './lib/terminalBuffer'

export default function App() {
  const updateSession = useSessionStore(s => s.updateSession)
  const addAttentionItem = useSessionStore(s => s.addAttentionItem)
  const removeSession = useSessionStore(s => s.removeSession)

  useEffect(() => {
    if (!window.api) {
      console.error('window.api is not available')
      return
    }

    // Initialize project store + git identity
    useProjectStore.getState().initialize()
    useGitIdentityStore.getState().initialize()

    // Buffer all terminal data globally so XTermRenderer can replay on mount
    const unsubTerminal = window.api.onTerminalData((sessionId, data) => {
      appendTerminalData(sessionId, data)
    })

    const unsubSession = window.api.onSessionUpdated((session) => {
      updateSession(session)
      // Refresh projects to update activeAgents counts
      useProjectStore.getState().refreshProjects()
    })

    const unsubAttention = window.api.onAttentionNeeded((item) => {
      addAttentionItem(item)
    })

    const unsubRemoved = window.api.onSessionRemoved((sessionId) => {
      removeSession(sessionId)
      clearTerminalBuffer(sessionId)
    })

    const unsubRoutine = window.api.onRoutineUpdated((execution) => {
      useRoutineStore.getState().updateExecution(execution)
    })

    window.api.listSessions().then((sessions) => {
      useSessionStore.getState().setSessions(sessions)
    })

    window.api.listRoutineExecutions().then((executions) => {
      useRoutineStore.getState().setExecutions(executions)
    })

    useRoutineStore.getState().loadRoutines()

    return () => {
      unsubTerminal()
      unsubSession()
      unsubAttention()
      unsubRemoved()
      unsubRoutine()
    }
  }, [updateSession, addAttentionItem, removeSession])

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
