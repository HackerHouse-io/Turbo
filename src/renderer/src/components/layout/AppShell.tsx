import { useEffect } from 'react'
import { TopBar } from './TopBar'
import { CommandCenter } from '../command-center/CommandCenter'
import { AgentDetailView } from '../command-center/AgentDetailView'
import { CommandPalette } from '../command-palette/CommandPalette'
import { TerminalDrawer } from '../terminal/TerminalDrawer'
import { TerminalWorkspace } from '../terminal/TerminalWorkspace'
import { RoutineDetailOverlay } from '../routines/RoutineDetailOverlay'
import { RoutineEditorOverlay } from '../routines/RoutineEditorOverlay'
import { PlanOverlay } from '../plan/PlanOverlay'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTerminalStore } from '../../stores/useTerminalStore'

export function AppShell() {
  const viewMode = useUIStore(s => s.viewMode)
  const commandPaletteOpen = useUIStore(s => s.commandPaletteOpen)
  const terminalDrawerOpen = useUIStore(s => s.terminalDrawerOpen)
  const projectSelectorOpen = useUIStore(s => s.projectSelectorOpen)
  const routineDetailRoutine = useUIStore(s => s.routineDetailRoutine)
  const routineEditorState = useUIStore(s => s.routineEditorState)
  const planOverlayOpen = useUIStore(s => s.planOverlayOpen)
  const terminalWorkspaceOpen = useUIStore(s => s.terminalWorkspaceOpen)
  const selectedSessionId = useSessionStore(s => s.selectedSessionId)

  // Global keyboard shortcuts — reads fresh state via getState() so no reactive deps needed
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
      }
      // Ctrl+` -> Toggle terminal workspace
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        const ui = useUIStore.getState()
        if (ui.terminalWorkspaceOpen) {
          ui.closeTerminalWorkspace()
        } else {
          const store = useProjectStore.getState()
          const proj = store.projects.find(p => p.id === store.selectedProjectId) || store.projects[0]
          if (proj?.path) {
            const panes = useTerminalStore.getState().workspacePanes[proj.path]
            if (!panes || panes.length === 0) {
              window.api.createPlainTerminal({ projectPath: proj.path, type: 'shell' })
            }
          }
          ui.openTerminalWorkspace()
        }
        return
      }
      // Escape -> Close overlays (highest z-index first)
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        const session = useSessionStore.getState()
        if (ui.routineEditorState) {
          ui.closeRoutineEditor()
        } else if (ui.planOverlayOpen) {
          ui.closePlanOverlay()
        } else if (ui.terminalWorkspaceOpen) {
          ui.closeTerminalWorkspace()
        } else if (ui.routineDetailRoutine) {
          ui.closeRoutineDetail()
        } else if (ui.projectSelectorOpen) {
          ui.closeProjectSelector()
        } else if (ui.commandPaletteOpen) {
          ui.closeCommandPalette()
        } else if (ui.terminalDrawerOpen) {
          ui.closeTerminalDrawer()
        } else if (session.selectedSessionId) {
          session.selectSession(null)
          ui.setViewMode('dashboard')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      {routineDetailRoutine && <RoutineDetailOverlay routine={routineDetailRoutine} />}
      {routineEditorState && <RoutineEditorOverlay />}
      {planOverlayOpen && <PlanOverlay />}
      {terminalWorkspaceOpen && <TerminalWorkspace />}
      {commandPaletteOpen && <CommandPalette />}
      {terminalDrawerOpen && <TerminalDrawer />}
    </div>
  )
}
