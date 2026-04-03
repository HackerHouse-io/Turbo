import { create } from 'zustand'
import { useTerminalStore } from './useTerminalStore'
import { useProjectStore } from './useProjectStore'

type TerminalDrawerTarget =
  | { type: 'session'; sessionId: string }
  | { type: 'plain'; terminalId: string }

interface UIState {
  // Command palette
  commandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  // Project selector dropdown
  projectSelectorOpen: boolean
  openProjectSelector: () => void
  closeProjectSelector: () => void
  toggleProjectSelector: () => void

  // Terminal drawer (fallback for plain terminals)
  terminalDrawerOpen: boolean
  terminalDrawerTarget: TerminalDrawerTarget | null
  openTerminalDrawer: (sessionId: string) => void
  openPlainTerminalDrawer: (terminalId: string) => void
  closeTerminalDrawer: () => void

  // Plan overlay
  planOverlayOpen: boolean
  openPlanOverlay: () => void
  closePlanOverlay: () => void

  // Terminal workspace
  terminalWorkspaceOpen: boolean
  openTerminalWorkspace: (workspaceId?: string) => void
  closeTerminalWorkspace: () => void

  // Session timeline
  timelineOpen: boolean
  openTimeline: () => void
  closeTimeline: () => void

  // Settings overlay
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void

  // Shortcuts overlay
  shortcutsOverlayOpen: boolean
  openShortcutsOverlay: () => void
  closeShortcutsOverlay: () => void
  toggleShortcutsOverlay: () => void

  // Notification center
  notificationCenterOpen: boolean
  openNotificationCenter: () => void
  closeNotificationCenter: () => void
  toggleNotificationCenter: () => void

  // Create project overlay
  createProjectOverlayOpen: boolean
  openCreateProjectOverlay: () => void
  closeCreateProjectOverlay: () => void

  // Sidebar collapsed
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Git panel
  gitPanelOpen: boolean
  openGitPanel: () => void
  closeGitPanel: () => void
  toggleGitPanel: () => void

  // View mode
  viewMode: 'main' | 'overview'
  showOverview: () => void
  hideOverview: () => void

  // Global drag-and-drop
  isDragOver: boolean
  setIsDragOver: (v: boolean) => void
  pendingDropPaths: string[]
  setPendingDropPaths: (paths: string[]) => void
  consumeDropPaths: () => string[]
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  projectSelectorOpen: false,
  openProjectSelector: () => set({ projectSelectorOpen: true }),
  closeProjectSelector: () => set({ projectSelectorOpen: false }),
  toggleProjectSelector: () => set(s => ({ projectSelectorOpen: !s.projectSelectorOpen })),

  terminalDrawerOpen: false,
  terminalDrawerTarget: null,
  openTerminalDrawer: (sessionId) =>
    set({ terminalDrawerOpen: true, terminalDrawerTarget: { type: 'session', sessionId } }),
  openPlainTerminalDrawer: (terminalId) =>
    set({ terminalDrawerOpen: true, terminalDrawerTarget: { type: 'plain', terminalId } }),
  closeTerminalDrawer: () =>
    set({ terminalDrawerOpen: false, terminalDrawerTarget: null }),

  planOverlayOpen: false,
  openPlanOverlay: () => set({ planOverlayOpen: true }),
  closePlanOverlay: () => set({ planOverlayOpen: false }),

  terminalWorkspaceOpen: false,
  openTerminalWorkspace: (workspaceId?: string) => {
    const termStore = useTerminalStore.getState()
    if (workspaceId) {
      termStore.setActiveWorkspace(workspaceId)
    } else {
      const projStore = useProjectStore.getState()
      const proj = projStore.projects.find(p => p.id === projStore.selectedProjectId) || projStore.projects[0]
      if (proj?.path) {
        const projectWorkspaces = Object.values(termStore.workspaces)
          .filter(ws => ws.projectPath === proj.path)
          .sort((a, b) => a.createdAt - b.createdAt)
        if (projectWorkspaces.length > 0) {
          termStore.setActiveWorkspace(projectWorkspaces[0].id)
        } else {
          const newId = termStore.createWorkspace(proj.path)
          termStore.setActiveWorkspace(newId)
          window.api.createPlainTerminal({ projectPath: proj.path, type: 'shell' }).then(terminal => {
            if (terminal) termStore.addTerminalToWorkspace(newId, terminal.id)
          })
        }
      }
    }
    set({ terminalWorkspaceOpen: true })
  },
  closeTerminalWorkspace: () => {
    useTerminalStore.getState().setActiveWorkspace(null)
    set({ terminalWorkspaceOpen: false })
  },

  timelineOpen: false,
  openTimeline: () => set({ timelineOpen: true }),
  closeTimeline: () => set({ timelineOpen: false }),

  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  shortcutsOverlayOpen: false,
  openShortcutsOverlay: () => set({ shortcutsOverlayOpen: true }),
  closeShortcutsOverlay: () => set({ shortcutsOverlayOpen: false }),
  toggleShortcutsOverlay: () => set(s => ({ shortcutsOverlayOpen: !s.shortcutsOverlayOpen })),

  notificationCenterOpen: false,
  openNotificationCenter: () => set({ notificationCenterOpen: true }),
  closeNotificationCenter: () => set({ notificationCenterOpen: false }),
  toggleNotificationCenter: () => set(s => ({ notificationCenterOpen: !s.notificationCenterOpen })),

  createProjectOverlayOpen: false,
  openCreateProjectOverlay: () => set({ createProjectOverlayOpen: true }),
  closeCreateProjectOverlay: () => set({ createProjectOverlayOpen: false }),

  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  gitPanelOpen: (() => {
    try { return localStorage.getItem('turbo:gitPanelOpen') !== 'false' } catch { return true }
  })(),
  openGitPanel: () => {
    set({ gitPanelOpen: true })
    try { localStorage.setItem('turbo:gitPanelOpen', 'true') } catch { /* */ }
  },
  closeGitPanel: () => {
    set({ gitPanelOpen: false })
    try { localStorage.setItem('turbo:gitPanelOpen', 'false') } catch { /* */ }
  },
  toggleGitPanel: () => set(s => {
    const next = !s.gitPanelOpen
    try { localStorage.setItem('turbo:gitPanelOpen', String(next)) } catch { /* */ }
    return { gitPanelOpen: next }
  }),

  viewMode: 'main',
  showOverview: () => set(s => s.viewMode === 'overview' ? s : { viewMode: 'overview' }),
  hideOverview: () => set(s => s.viewMode === 'main' ? s : { viewMode: 'main' }),

  isDragOver: false,
  setIsDragOver: (v) => set({ isDragOver: v }),
  pendingDropPaths: [],
  setPendingDropPaths: (paths) => set({ pendingDropPaths: paths }),
  consumeDropPaths: () => {
    let paths: string[] = []
    set(state => {
      paths = state.pendingDropPaths
      return { pendingDropPaths: [] }
    })
    return paths
  }
}))
