import { create } from 'zustand'
import { DEFAULT_KEYBINDINGS } from '../../../shared/constants'
import type { KeybindingActionId, KeybindingDefinition, KeybindingOverrides } from '../../../shared/types'

interface KeybindingsState {
  overrides: KeybindingOverrides
  initialized: boolean
  initialize: () => Promise<void>
  getShortcut: (id: KeybindingActionId) => string | null
  setShortcut: (id: KeybindingActionId, shortcut: string | null) => void
  resetShortcut: (id: KeybindingActionId) => void
  resetAll: () => void
  findConflict: (shortcut: string, excludeId: KeybindingActionId) => KeybindingDefinition | null
}

export const useKeybindingsStore = create<KeybindingsState>((set, get) => ({
  overrides: {},
  initialized: false,

  initialize: async () => {
    if (get().initialized) return
    const saved = await window.api.getSetting('keybindingOverrides')
    set({
      overrides: (saved as KeybindingOverrides) || {},
      initialized: true
    })
  },

  getShortcut: (id) => {
    const { overrides } = get()
    if (id in overrides) return overrides[id] ?? null
    const def = DEFAULT_KEYBINDINGS.find(d => d.id === id)
    return def?.defaultShortcut ?? null
  },

  setShortcut: (id, shortcut) => {
    const next = { ...get().overrides, [id]: shortcut }
    set({ overrides: next })
    window.api.setSetting('keybindingOverrides', next)
  },

  resetShortcut: (id) => {
    const next = { ...get().overrides }
    delete next[id]
    set({ overrides: next })
    window.api.setSetting('keybindingOverrides', next)
  },

  resetAll: () => {
    set({ overrides: {} })
    window.api.setSetting('keybindingOverrides', {})
  },

  findConflict: (shortcut, excludeId) => {
    const { getShortcut } = get()
    const normalized = shortcut.toLowerCase()
    for (const def of DEFAULT_KEYBINDINGS) {
      if (def.id === excludeId) continue
      const effective = getShortcut(def.id)
      if (effective && effective.toLowerCase() === normalized) return def
    }
    return null
  }
}))
