import { useEffect, useRef, memo } from 'react'
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

// ─── Overlays (each subscribes only to its own boolean) ─────────

const Overlays = memo(function Overlays() {
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
  const viewMode = useUIStore(s => s.viewMode)
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
              <span className="text-xs text-turbo-text-muted">Images, code, documents</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
