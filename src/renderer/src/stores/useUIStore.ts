import { create } from 'zustand'
import type { PromptTemplate, Routine } from '../../../shared/types'

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
  terminalDrawerSessionId: string | null
  openTerminalDrawer: (sessionId: string) => void
  closeTerminalDrawer: () => void

  // View mode
  viewMode: 'dashboard' | 'detail'
  setViewMode: (mode: 'dashboard' | 'detail') => void

  // Routine detail overlay
  routineDetailRoutine: Routine | null
  openRoutineDetail: (routine: Routine) => void
  closeRoutineDetail: () => void

  // Routine editor overlay
  routineEditorState: { routine: Routine | null; mode: 'create' | 'edit' | 'duplicate' } | null
  openRoutineEditor: (routine: Routine | null, mode: 'create' | 'edit' | 'duplicate') => void
  closeRoutineEditor: () => void
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
  terminalDrawerSessionId: null,
  openTerminalDrawer: (sessionId) =>
    set({ terminalDrawerOpen: true, terminalDrawerSessionId: sessionId }),
  closeTerminalDrawer: () =>
    set({ terminalDrawerOpen: false, terminalDrawerSessionId: null }),

  viewMode: 'dashboard',
  setViewMode: (mode) => set({ viewMode: mode }),

  routineDetailRoutine: null,
  openRoutineDetail: (routine) => set({ routineDetailRoutine: routine }),
  closeRoutineDetail: () => set({ routineDetailRoutine: null }),

  routineEditorState: null,
  openRoutineEditor: (routine, mode) => set({ routineEditorState: { routine, mode } }),
  closeRoutineEditor: () => set({ routineEditorState: null })
}))
