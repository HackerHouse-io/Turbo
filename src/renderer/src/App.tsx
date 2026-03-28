import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useSessionStore } from './stores/useSessionStore'
import { useProjectStore } from './stores/useProjectStore'

export default function App() {
  const updateSession = useSessionStore(s => s.updateSession)
  const addAttentionItem = useSessionStore(s => s.addAttentionItem)
  const removeSession = useSessionStore(s => s.removeSession)

  useEffect(() => {
    if (!window.api) {
      console.error('window.api is not available')
      return
    }

    // Initialize project store
    useProjectStore.getState().initialize()

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
    })

    window.api.listSessions().then((sessions) => {
      useSessionStore.getState().setSessions(sessions)
    })

    return () => {
      unsubSession()
      unsubAttention()
      unsubRemoved()
    }
  }, [updateSession, addAttentionItem, removeSession])

  return <AppShell />
}
