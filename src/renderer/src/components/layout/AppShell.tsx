import { useEffect, memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopBar } from './TopBar'
import { CommandCenter } from '../command-center/CommandCenter'
import { AgentDetailView } from '../command-center/AgentDetailView'
import { ProjectOverview } from '../overview/ProjectOverview'
import { CommandPalette } from '../command-palette/CommandPalette'
import { TerminalDrawer } from '../terminal/TerminalDrawer'
import { TerminalWorkspace } from '../terminal/TerminalWorkspace'
import { PlaybookDetailOverlay } from '../playbooks/PlaybookDetailOverlay'
import { PlaybookEditorOverlay } from '../playbooks/PlaybookEditorOverlay'
import { PlanOverlay } from '../plan/PlanOverlay'
import { SessionTimeline } from '../timeline/SessionTimeline'
import { SettingsOverlay } from '../settings/SettingsOverlay'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useKeybindingsStore } from '../../stores/useKeybindingsStore'
import { matchesEvent } from '../../lib/keybindings'
import { ShortcutsOverlay } from '../shortcuts/ShortcutsOverlay'
import { ToastContainer } from '../notifications/ToastContainer'
import { NotificationCenter } from '../notifications/NotificationCenter'

// ─── Main Content (only re-renders on viewMode / selectedSession changes) ───

const MainContent = memo(function MainContent() {
  const viewMode = useUIStore(s => s.viewMode)
  const selectedSessionId = useSessionStore(s => s.selectedSessionId)

  return (
    <main className="flex-1 overflow-hidden">
      {viewMode === 'overview' ? (
        <ProjectOverview />
      ) : viewMode === 'dashboard' || !selectedSessionId ? (
        <CommandCenter />
      ) : (
        <AgentDetailView sessionId={selectedSessionId} />
      )}
    </main>
  )
})

// ─── Overlays (each subscribes only to its own boolean) ─────────

const Overlays = memo(function Overlays() {
  const playbookDetail = useUIStore(s => s.playbookDetail)
  const playbookEditorState = useUIStore(s => s.playbookEditorState)
  const planOverlayOpen = useUIStore(s => s.planOverlayOpen)
  const terminalWorkspaceOpen = useUIStore(s => s.terminalWorkspaceOpen)
  const timelineOpen = useUIStore(s => s.timelineOpen)
  const settingsOpen = useUIStore(s => s.settingsOpen)
  const shortcutsOverlayOpen = useUIStore(s => s.shortcutsOverlayOpen)
  const commandPaletteOpen = useUIStore(s => s.commandPaletteOpen)
  const terminalDrawerOpen = useUIStore(s => s.terminalDrawerOpen)
  const notificationCenterOpen = useUIStore(s => s.notificationCenterOpen)

  return (
    <>
      {playbookDetail && <PlaybookDetailOverlay playbook={playbookDetail} />}
      {playbookEditorState && <PlaybookEditorOverlay />}
      {planOverlayOpen && <PlanOverlay />}
      {terminalWorkspaceOpen && <TerminalWorkspace />}
      {timelineOpen && <SessionTimeline />}
      <AnimatePresence>{settingsOpen && <SettingsOverlay />}</AnimatePresence>
      <AnimatePresence>{shortcutsOverlayOpen && <ShortcutsOverlay />}</AnimatePresence>
      {commandPaletteOpen && <CommandPalette />}
      {terminalDrawerOpen && <TerminalDrawer />}
      <AnimatePresence>{notificationCenterOpen && <NotificationCenter />}</AnimatePresence>
      <ToastContainer />
    </>
  )
})

// ─── App Shell ──────────────────────────────────────────────────

export function AppShell() {
  // Global keyboard shortcuts — reads fresh state via getState() so no reactive deps needed
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const kb = useKeybindingsStore.getState()

      if (matchesEvent(kb.getShortcut('toggleCommandPalette'), e)) {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
        return
      }
      if (matchesEvent(kb.getShortcut('toggleTerminalWorkspace'), e)) {
        e.preventDefault()
        const ui = useUIStore.getState()
        if (ui.terminalWorkspaceOpen) ui.closeTerminalWorkspace()
        else ui.openTerminalWorkspace()
        return
      }
      if (matchesEvent(kb.getShortcut('toggleSettings'), e)) {
        e.preventDefault()
        const ui = useUIStore.getState()
        if (ui.settingsOpen) ui.closeSettings()
        else ui.openSettings()
        return
      }
      if (matchesEvent(kb.getShortcut('toggleOverview'), e)) {
        e.preventDefault()
        useUIStore.getState().toggleOverview()
        return
      }
      if (matchesEvent(kb.getShortcut('toggleTimeline'), e)) {
        e.preventDefault()
        const ui = useUIStore.getState()
        if (ui.timelineOpen) ui.closeTimeline()
        else ui.openTimeline()
        return
      }
      if (matchesEvent(kb.getShortcut('togglePlanOverlay'), e)) {
        e.preventDefault()
        const ui = useUIStore.getState()
        if (ui.planOverlayOpen) ui.closePlanOverlay()
        else ui.openPlanOverlay()
        return
      }
      if (matchesEvent(kb.getShortcut('toggleProjectSelector'), e)) {
        e.preventDefault()
        useUIStore.getState().toggleProjectSelector()
        return
      }
      if (matchesEvent(kb.getShortcut('showShortcuts'), e)) {
        e.preventDefault()
        useUIStore.getState().toggleShortcutsOverlay()
        return
      }
      // Escape -> Close overlays (highest z-index first) — stays hardcoded
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        const session = useSessionStore.getState()
        if (ui.shortcutsOverlayOpen) {
          ui.closeShortcutsOverlay()
        } else if (ui.notificationCenterOpen) {
          ui.closeNotificationCenter()
        } else if (ui.settingsOpen) {
          ui.closeSettings()
        } else if (ui.playbookEditorState) {
          ui.closePlaybookEditor()
        } else if (ui.planOverlayOpen) {
          ui.closePlanOverlay()
        } else if (ui.terminalWorkspaceOpen) {
          ui.closeTerminalWorkspace()
        } else if (ui.timelineOpen) {
          ui.closeTimeline()
        } else if (ui.playbookDetail) {
          ui.closePlaybookDetail()
        } else if (ui.projectSelectorOpen) {
          ui.closeProjectSelector()
        } else if (ui.commandPaletteOpen) {
          ui.closeCommandPalette()
        } else if (ui.terminalDrawerOpen) {
          ui.closeTerminalDrawer()
        } else if (ui.viewMode === 'overview') {
          ui.setViewMode('dashboard')
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

      <MainContent />
      <Overlays />
    </div>
  )
}
