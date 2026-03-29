import { create } from 'zustand'
import type { PromptTemplate, Routine } from '../../../shared/types'

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
  openTerminalWorkspace: () => void
  closeTerminalWorkspace: () => void

  // Session timeline
  timelineOpen: boolean
  openTimeline: () => void
  closeTimeline: () => void
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
  openTerminalWorkspace: () => set({ terminalWorkspaceOpen: true }),
  closeTerminalWorkspace: () => set({ terminalWorkspaceOpen: false }),

  timelineOpen: false,
  openTimeline: () => set({ timelineOpen: true }),
  closeTimeline: () => set({ timelineOpen: false })
}))
