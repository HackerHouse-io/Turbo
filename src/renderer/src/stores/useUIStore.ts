import { create } from 'zustand'
import type { PromptTemplate } from '../../../shared/types'

interface UIState {
  // Command palette
  commandPaletteOpen: boolean
  pendingTemplateFill: PromptTemplate | null
  openCommandPalette: () => void
  openCommandPaletteWithTemplate: (template: PromptTemplate) => void
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
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  pendingTemplateFill: null,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  openCommandPaletteWithTemplate: (template) => set({ commandPaletteOpen: true, pendingTemplateFill: template }),
  closeCommandPalette: () => set({ commandPaletteOpen: false, pendingTemplateFill: null }),
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
  setViewMode: (mode) => set({ viewMode: mode })
}))
