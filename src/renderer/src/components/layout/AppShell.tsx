import { useEffect } from 'react'
import { TopBar } from './TopBar'
import { CommandCenter } from '../command-center/CommandCenter'
import { AgentDetailView } from '../command-center/AgentDetailView'
import { CommandPalette } from '../command-palette/CommandPalette'
import { TerminalDrawer } from '../terminal/TerminalDrawer'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'

export function AppShell() {
  const viewMode = useUIStore(s => s.viewMode)
  const commandPaletteOpen = useUIStore(s => s.commandPaletteOpen)
  const terminalDrawerOpen = useUIStore(s => s.terminalDrawerOpen)
  const projectSelectorOpen = useUIStore(s => s.projectSelectorOpen)
  const selectedSessionId = useSessionStore(s => s.selectedSessionId)

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
      }
      // Escape -> Close overlays
      if (e.key === 'Escape') {
        if (projectSelectorOpen) {
          useUIStore.getState().closeProjectSelector()
        } else if (commandPaletteOpen) {
          useUIStore.getState().closeCommandPalette()
        } else if (terminalDrawerOpen) {
          useUIStore.getState().closeTerminalDrawer()
        } else if (selectedSessionId) {
          useSessionStore.getState().selectSession(null)
          useUIStore.getState().setViewMode('dashboard')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, terminalDrawerOpen, projectSelectorOpen, selectedSessionId])

  return (
    <div className="h-full flex flex-col bg-turbo-bg">
      {/* Title bar drag region */}
      <div className="drag-region h-8 flex-shrink-0" />

      {/* Top bar */}
      <TopBar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'dashboard' || !selectedSessionId ? (
          <CommandCenter />
        ) : (
          <AgentDetailView sessionId={selectedSessionId} />
        )}
      </main>

      {/* Overlays */}
      {commandPaletteOpen && <CommandPalette />}
      {terminalDrawerOpen && <TerminalDrawer />}
    </div>
  )
}
