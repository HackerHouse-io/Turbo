import { create } from 'zustand'

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
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
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
