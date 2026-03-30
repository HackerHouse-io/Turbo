import { create } from 'zustand'
import type { PlainTerminal } from '../../../shared/types'

export const MAX_PANES = 4
const STORAGE_KEY = 'turbo:workspaces'

export interface Workspace {
  id: string
  name: string
  projectPath: string
  terminalIds: string[] // max 4
  createdAt: number
}

interface TerminalState {
  // All known terminals
  terminals: Record<string, PlainTerminal>

  // Multi-workspace state
  workspaces: Record<string, Workspace>       // workspaceId → Workspace
  activeWorkspaceId: string | null            // which workspace overlay shows
  focusedPaneId: string | null

  // Data actions
  setTerminals: (terminals: PlainTerminal[]) => void
  addTerminal: (terminal: PlainTerminal) => void
  removeTerminal: (terminalId: string) => void

  // Workspace CRUD
  createWorkspace: (projectPath: string, name?: string) => string
  renameWorkspace: (id: string, name: string) => void
  deleteWorkspace: (id: string) => void
  addTerminalToWorkspace: (workspaceId: string, terminalId: string) => void
  removeTerminalFromWorkspace: (workspaceId: string, terminalId: string) => void
  setActiveWorkspace: (id: string | null) => void

  // Pane focus
  setFocusedPane: (terminalId: string | null) => void
}

// ─── localStorage helpers ──────────────────────────────────

function loadWorkspaces(): Record<string, Workspace> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveWorkspaces(workspaces: Record<string, Workspace>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
  } catch {
    // storage full or unavailable
  }
}

// ─── Store ─────────────────────────────────────────────────

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: {},
  workspaces: loadWorkspaces(),
  activeWorkspaceId: null,
  focusedPaneId: null,

  setTerminals: (terminals) => {
    const record: Record<string, PlainTerminal> = {}
    for (const t of terminals) {
      record[t.id] = t
    }

    // Reconcile workspaces: remove stale terminal IDs
    const savedWorkspaces = { ...get().workspaces }
    const terminalIdSet = new Set(terminals.map(t => t.id))
    let changed = false

    for (const wsId of Object.keys(savedWorkspaces)) {
      const ws = savedWorkspaces[wsId]
      const filtered = ws.terminalIds.filter(id => terminalIdSet.has(id))
      if (filtered.length !== ws.terminalIds.length) {
        savedWorkspaces[wsId] = { ...ws, terminalIds: filtered }
        changed = true
      }
    }

    // Create a "Default" workspace per project if none exists
    const projectPaths = new Set(terminals.map(t => t.projectPath))
    for (const path of projectPaths) {
      const hasWorkspace = Object.values(savedWorkspaces).some(ws => ws.projectPath === path)
      if (!hasWorkspace) {
        const projectTerminals = terminals.filter(t => t.projectPath === path)
        const id = crypto.randomUUID()
        savedWorkspaces[id] = {
          id,
          name: 'Default',
          projectPath: path,
          terminalIds: projectTerminals.slice(0, MAX_PANES).map(t => t.id),
          createdAt: Date.now()
        }
        changed = true
      }
    }

    if (changed) saveWorkspaces(savedWorkspaces)
    set({ terminals: record, workspaces: savedWorkspaces })
  },

  addTerminal: (terminal) => {
    set(s => ({
      terminals: { ...s.terminals, [terminal.id]: terminal }
    }))
    // Does NOT auto-assign to workspace — caller assigns
  },

  removeTerminal: (terminalId) => {
    set(s => {
      const { [terminalId]: removed, ...rest } = s.terminals

      // Remove from any workspace that contains it
      const newWorkspaces = { ...s.workspaces }
      let wsChanged = false
      for (const wsId of Object.keys(newWorkspaces)) {
        const ws = newWorkspaces[wsId]
        if (ws.terminalIds.includes(terminalId)) {
          newWorkspaces[wsId] = {
            ...ws,
            terminalIds: ws.terminalIds.filter(id => id !== terminalId)
          }
          wsChanged = true
        }
      }

      if (wsChanged) saveWorkspaces(newWorkspaces)

      return {
        terminals: rest,
        workspaces: newWorkspaces,
        focusedPaneId: s.focusedPaneId === terminalId ? null : s.focusedPaneId
      }
    })
  },

  createWorkspace: (projectPath, name) => {
    const id = crypto.randomUUID()
    const existingCount = Object.values(get().workspaces).filter(
      ws => ws.projectPath === projectPath
    ).length
    const workspace: Workspace = {
      id,
      name: name ?? `Workspace ${existingCount + 1}`,
      projectPath,
      terminalIds: [],
      createdAt: Date.now()
    }

    set(s => {
      const newWorkspaces = { ...s.workspaces, [id]: workspace }
      saveWorkspaces(newWorkspaces)
      return { workspaces: newWorkspaces }
    })

    return id
  },

  renameWorkspace: (id, name) => {
    set(s => {
      const ws = s.workspaces[id]
      if (!ws) return s
      const newWorkspaces = { ...s.workspaces, [id]: { ...ws, name } }
      saveWorkspaces(newWorkspaces)
      return { workspaces: newWorkspaces }
    })
  },

  deleteWorkspace: (id) => {
    const ws = get().workspaces[id]
    if (!ws) return

    // Kill all terminals in this workspace
    for (const terminalId of ws.terminalIds) {
      window.api.killPlainTerminal(terminalId)
    }

    set(s => {
      const { [id]: removed, ...rest } = s.workspaces
      saveWorkspaces(rest)
      return {
        workspaces: rest,
        activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId
      }
    })
  },

  addTerminalToWorkspace: (workspaceId, terminalId) => {
    set(s => {
      const ws = s.workspaces[workspaceId]
      if (!ws || ws.terminalIds.length >= MAX_PANES || ws.terminalIds.includes(terminalId)) return s
      const newWorkspaces = {
        ...s.workspaces,
        [workspaceId]: { ...ws, terminalIds: [...ws.terminalIds, terminalId] }
      }
      saveWorkspaces(newWorkspaces)
      return { workspaces: newWorkspaces }
    })
  },

  removeTerminalFromWorkspace: (workspaceId, terminalId) => {
    set(s => {
      const ws = s.workspaces[workspaceId]
      if (!ws) return s
      const newWorkspaces = {
        ...s.workspaces,
        [workspaceId]: { ...ws, terminalIds: ws.terminalIds.filter(id => id !== terminalId) }
      }
      saveWorkspaces(newWorkspaces)
      return {
        workspaces: newWorkspaces,
        focusedPaneId: s.focusedPaneId === terminalId ? null : s.focusedPaneId
      }
    })
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  setFocusedPane: (terminalId) => set({ focusedPaneId: terminalId })
}))
