import { create } from 'zustand'
import type { PromptTemplate, Routine } from '../../../shared/types'
import { useTerminalStore } from './useTerminalStore'
import { useProjectStore } from './useProjectStore'

type TerminalDrawerTarget =
  | { type: 'session'; sessionId: string }
  | { type: 'plain'; terminalId: string }

interface UIState {
  // Command palette
  commandPaletteOpen: boolean
  pendingTemplateFill: PromptTemplate | null
  pendingRoutineFill: Routine | null
  openCommandPalette: () => void
  openCommandPaletteWithTemplate: (template: PromptTemplate) => void
  openCommandPaletteWithRoutine: (routine: Routine) => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  // Project selector dropdown
  projectSelectorOpen: boolean
  openProjectSelector: () => void
  closeProjectSelector: () => void
  toggleProjectSelector: () => void

  // Terminal drawer
  terminalDrawerOpen: boolean
  terminalDrawerTarget: TerminalDrawerTarget | null
  openTerminalDrawer: (sessionId: string) => void
  openPlainTerminalDrawer: (terminalId: string) => void
  closeTerminalDrawer: () => void

  // View mode
  viewMode: 'dashboard' | 'detail' | 'overview'
  setViewMode: (mode: 'dashboard' | 'detail' | 'overview') => void
  toggleOverview: () => void

  // Routine detail overlay
  routineDetailRoutine: Routine | null
  openRoutineDetail: (routine: Routine) => void
  closeRoutineDetail: () => void

  // Routine editor overlay
  routineEditorState: { routine: Routine | null; mode: 'create' | 'edit' | 'duplicate' } | null
  openRoutineEditor: (routine: Routine | null, mode: 'create' | 'edit' | 'duplicate') => void
  closeRoutineEditor: () => void

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
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  pendingTemplateFill: null,
  pendingRoutineFill: null,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  openCommandPaletteWithTemplate: (template) => set({ commandPaletteOpen: true, pendingTemplateFill: template }),
  openCommandPaletteWithRoutine: (routine) => set({ commandPaletteOpen: true, pendingRoutineFill: routine }),
  closeCommandPalette: () => set({ commandPaletteOpen: false, pendingTemplateFill: null, pendingRoutineFill: null }),
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

  viewMode: 'dashboard',
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleOverview: () => set(s => ({ viewMode: s.viewMode === 'overview' ? 'dashboard' : 'overview' })),

  routineDetailRoutine: null,
  openRoutineDetail: (routine) => set({ routineDetailRoutine: routine }),
  closeRoutineDetail: () => set({ routineDetailRoutine: null }),

  routineEditorState: null,
  openRoutineEditor: (routine, mode) => set({ routineEditorState: { routine, mode } }),
  closeRoutineEditor: () => set({ routineEditorState: null }),

  planOverlayOpen: false,
  openPlanOverlay: () => set({ planOverlayOpen: true }),
  closePlanOverlay: () => set({ planOverlayOpen: false }),

  terminalWorkspaceOpen: false,
  openTerminalWorkspace: (workspaceId?: string) => {
    const termStore = useTerminalStore.getState()
    if (workspaceId) {
      termStore.setActiveWorkspace(workspaceId)
    } else {
      // Open first workspace for current project, or create one (seeded with a shell)
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
          // Seed the new workspace with a shell terminal
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
  closeSettings: () => set({ settingsOpen: false })
}))
