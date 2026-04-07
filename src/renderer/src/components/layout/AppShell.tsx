import { useEffect, memo, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopBar } from './TopBar'
import { SplitLayout } from './SplitLayout'
import { CommandPalette } from '../command-palette/CommandPalette'
import { TerminalDrawer } from '../terminal/TerminalDrawer'
import { TerminalWorkspace } from '../terminal/TerminalWorkspace'
import { PlanOverlay } from '../plan/PlanOverlay'
import { SessionTimeline } from '../timeline/SessionTimeline'
import { SettingsOverlay } from '../settings/SettingsOverlay'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useKeybindingsStore } from '../../stores/useKeybindingsStore'
import { useGitActionsStore } from '../../stores/useGitActionsStore'
import { matchesEvent } from '../../lib/keybindings'
import { ShortcutsOverlay } from '../shortcuts/ShortcutsOverlay'
import { ToastContainer } from '../notifications/ToastContainer'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { CreateProjectOverlay } from '../project/CreateProjectOverlay'
import { ProjectOverview } from '../overview/ProjectOverview'
import { useTourAutoStart } from '../../hooks/useTourAutoStart'
import { useTourStore } from '../../stores/useTourStore'

// Lazy-load the tour to keep ~350 lines of SVG illustrations out of cold start
const OnboardingTour = lazy(() =>
  import('../onboarding/OnboardingTour').then(m => ({ default: m.OnboardingTour }))
)

// ─── Overlays (each subscribes only to its own boolean) ─────────

const WorkspaceOverlay = memo(function WorkspaceOverlay() {
  const open = useUIStore(s => s.terminalWorkspaceOpen)
  const dir = useUIStore(s => s.workspaceNavDirection)
  return (
    <AnimatePresence mode="wait" custom={dir}>
      {open && <TerminalWorkspace key="terminal-workspace" />}
    </AnimatePresence>
  )
})

const Overlays = memo(function Overlays() {
  const planOverlayOpen = useUIStore(s => s.planOverlayOpen)
  const timelineOpen = useUIStore(s => s.timelineOpen)
  const settingsOpen = useUIStore(s => s.settingsOpen)
  const shortcutsOverlayOpen = useUIStore(s => s.shortcutsOverlayOpen)
  const commandPaletteOpen = useUIStore(s => s.commandPaletteOpen)
  const terminalDrawerOpen = useUIStore(s => s.terminalDrawerOpen)
  const notificationCenterOpen = useUIStore(s => s.notificationCenterOpen)
  const createProjectOverlayOpen = useUIStore(s => s.createProjectOverlayOpen)
  const tourOpen = useTourStore(s => s.tourOpen)

  return (
    <>
      {planOverlayOpen && <PlanOverlay />}
      <WorkspaceOverlay />
      {timelineOpen && <SessionTimeline />}
      <AnimatePresence>{settingsOpen && <SettingsOverlay />}</AnimatePresence>
      <AnimatePresence>{shortcutsOverlayOpen && <ShortcutsOverlay />}</AnimatePresence>
      {commandPaletteOpen && <CommandPalette />}
      {terminalDrawerOpen && <TerminalDrawer />}
      <AnimatePresence>{notificationCenterOpen && <NotificationCenter />}</AnimatePresence>
      <AnimatePresence>{createProjectOverlayOpen && <CreateProjectOverlay />}</AnimatePresence>
      {tourOpen && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
      <ToastContainer />
    </>
  )
})

// ─── App Shell ──────────────────────────────────────────────────

export function AppShell() {
  useTourAutoStart()

  // ─── Global drag-and-drop (fallback for drops outside React drop zones) ───
  const viewMode = useUIStore(s => s.viewMode)

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files || [])
      const paths = files.map(f => window.api.getPathForFile(f)).filter(Boolean)
      if (paths.length > 0) {
        useUIStore.getState().setPendingDropPaths(paths)
      }
    }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  // Global keyboard shortcuts
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
      if (matchesEvent(kb.getShortcut('workspaceDown'), e)) {
        e.preventDefault()
        useUIStore.getState().navigateWorkspaceDown()
        return
      }
      if (matchesEvent(kb.getShortcut('workspaceUp'), e)) {
        e.preventDefault()
        useUIStore.getState().navigateWorkspaceUp()
        return
      }
      // Git panel toggle: Cmd+G
      if (e.key === 'g' && e.metaKey && !e.shiftKey) {
        e.preventDefault()
        useUIStore.getState().toggleGitPanel()
        return
      }

      // Git actions: Cmd+Shift+C/P/L/S — delegate to shared store
      if (e.metaKey && e.shiftKey) {
        const ga = useGitActionsStore.getState()
        if (e.key === 'C' || e.key === 'c') {
          e.preventDefault(); ga.quickCommit(); return
        }
        if (e.key === 'P' || e.key === 'p') {
          e.preventDefault(); ga.push(); return
        }
        if (e.key === 'L' || e.key === 'l') {
          e.preventDefault(); ga.pull(); return
        }
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault(); ga.shipIt(); return
        }
      }

      // Escape -> Close overlays (highest z-index first)
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        if (ui.createProjectOverlayOpen) {
          ui.closeCreateProjectOverlay()
        } else if (ui.shortcutsOverlayOpen) {
          ui.closeShortcutsOverlay()
        } else if (ui.notificationCenterOpen) {
          ui.closeNotificationCenter()
        } else if (ui.settingsOpen) {
          ui.closeSettings()
        } else if (ui.planOverlayOpen) {
          ui.closePlanOverlay()
        } else if (ui.terminalWorkspaceOpen) {
          ui.closeTerminalWorkspace()
        } else if (ui.timelineOpen) {
          ui.closeTimeline()
        } else if (ui.projectSelectorOpen) {
          ui.closeProjectSelector()
        } else if (ui.commandPaletteOpen) {
          ui.closeCommandPalette()
        } else if (ui.terminalDrawerOpen) {
          ui.closeTerminalDrawer()
        } else if (useTourStore.getState().tourOpen) {
          useTourStore.getState().endTour()
        } else if (ui.viewMode === 'overview') {
          ui.hideOverview()
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
      {viewMode === 'overview' ? <ProjectOverview /> : <SplitLayout />}

      <Overlays />
    </div>
  )
}
