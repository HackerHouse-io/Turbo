import { useEffect, useRef, memo } from 'react'
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
import { CreateProjectOverlay } from '../project/CreateProjectOverlay'

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
  const createProjectOverlayOpen = useUIStore(s => s.createProjectOverlayOpen)

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
      <AnimatePresence>{createProjectOverlayOpen && <CreateProjectOverlay />}</AnimatePresence>
      <ToastContainer />
    </>
  )
})

// ─── App Shell ──────────────────────────────────────────────────

export function AppShell() {
  // ─── Global drag-and-drop ─────────────────────────────────
  const dragCounterRef = useRef(0)
  const isDragOver = useUIStore(s => s.isDragOver)

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current++
      if (e.dataTransfer?.types.includes('Files')) {
        useUIStore.getState().setIsDragOver(true)
      }
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        useUIStore.getState().setIsDragOver(false)
      }
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      useUIStore.getState().setIsDragOver(false)

      const files = Array.from(e.dataTransfer?.files || [])
      const paths = files.map(f => window.api.getPathForFile(f)).filter(Boolean)
      if (paths.length > 0) {
        useUIStore.getState().setPendingDropPaths(paths)
      }
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

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
        if (ui.createProjectOverlayOpen) {
          ui.closeCreateProjectOverlay()
        } else if (ui.shortcutsOverlayOpen) {
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

      {/* Global file drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[200] bg-turbo-bg/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-turbo-accent/60 rounded-2xl px-12 py-10 bg-turbo-surface/80">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              <span className="text-sm text-turbo-accent font-medium">Drop files to attach</span>
              <span className="text-xs text-turbo-text-muted">Images, code, documents — anything</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
