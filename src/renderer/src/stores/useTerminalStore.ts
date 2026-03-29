import { create } from 'zustand'
import type { PlainTerminal } from '../../../shared/types'

const MAX_PANES = 4

interface TerminalState {
  // All known terminals
  terminals: Record<string, PlainTerminal>

  // Workspace state: ordered pane IDs per project
  workspacePanes: Record<string, string[]> // projectPath → [terminalId, ...]
  focusedPaneId: string | null

  // Data actions
  setTerminals: (terminals: PlainTerminal[]) => void
  addTerminal: (terminal: PlainTerminal) => void
  removeTerminal: (terminalId: string) => void

  // Workspace actions
  addPane: (projectPath: string, terminalId: string) => void
  removePane: (projectPath: string, terminalId: string) => void
  setFocusedPane: (terminalId: string | null) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: {},
  workspacePanes: {},
  focusedPaneId: null,

  setTerminals: (terminals) => {
    const record: Record<string, PlainTerminal> = {}
    const panes: Record<string, string[]> = {}
    for (const t of terminals) {
      record[t.id] = t
      if (!panes[t.projectPath]) panes[t.projectPath] = []
      if (panes[t.projectPath].length < MAX_PANES) {
        panes[t.projectPath].push(t.id)
      }
    }
    set({ terminals: record, workspacePanes: panes })
  },

  addTerminal: (terminal) => {
    set(s => ({
      terminals: { ...s.terminals, [terminal.id]: terminal }
    }))
    // Also add to workspace panes
    get().addPane(terminal.projectPath, terminal.id)
  },

  removeTerminal: (terminalId) => {
    set(s => {
      const { [terminalId]: removed, ...rest } = s.terminals
      const projectPath = removed?.projectPath
      const newPanes = { ...s.workspacePanes }
      if (projectPath && newPanes[projectPath]) {
        newPanes[projectPath] = newPanes[projectPath].filter(id => id !== terminalId)
        if (newPanes[projectPath].length === 0) delete newPanes[projectPath]
      }
      return {
        terminals: rest,
        workspacePanes: newPanes,
        focusedPaneId: s.focusedPaneId === terminalId ? null : s.focusedPaneId
      }
    })
  },

  addPane: (projectPath, terminalId) => {
    set(s => {
      const current = s.workspacePanes[projectPath] || []
      if (current.length >= MAX_PANES || current.includes(terminalId)) return s
      return {
        workspacePanes: {
          ...s.workspacePanes,
          [projectPath]: [...current, terminalId]
        }
      }
    })
  },

  removePane: (projectPath, terminalId) => {
    set(s => {
      const current = s.workspacePanes[projectPath]
      if (!current) return s
      const filtered = current.filter(id => id !== terminalId)
      const newPanes = { ...s.workspacePanes }
      if (filtered.length === 0) {
        delete newPanes[projectPath]
      } else {
        newPanes[projectPath] = filtered
      }
      return {
        workspacePanes: newPanes,
        focusedPaneId: s.focusedPaneId === terminalId ? null : s.focusedPaneId
      }
    })
  },

  setFocusedPane: (terminalId) => set({ focusedPaneId: terminalId })
}))
