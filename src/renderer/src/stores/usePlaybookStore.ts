import { create } from 'zustand'
import type { Playbook, PlaybookExecution } from '../../../shared/types'

interface PlaybookState {
  executions: Record<string, PlaybookExecution>
  playbooks: Playbook[]
  loadPlaybooks: () => Promise<void>
  savePlaybook: (playbook: Playbook) => Promise<Playbook>
  deletePlaybook: (id: string) => Promise<void>
  duplicatePlaybook: (id: string) => Promise<Playbook>
  setExecutions: (list: PlaybookExecution[]) => void
  updateExecution: (execution: PlaybookExecution) => void
  removeExecution: (executionId: string) => void
}

export const usePlaybookStore = create<PlaybookState>((set) => ({
  executions: {},
  playbooks: [],

  loadPlaybooks: async () => {
    const playbooks = await window.api.listPlaybooks()
    set({ playbooks })
  },

  savePlaybook: async (playbook) => {
    const saved = await window.api.savePlaybook(playbook)
    set(state => ({
      playbooks: state.playbooks.some(r => r.id === saved.id)
        ? state.playbooks.map(r => r.id === saved.id ? saved : r)
        : [...state.playbooks, saved]
    }))
    return saved
  },

  deletePlaybook: async (id) => {
    await window.api.deletePlaybook(id)
    set(state => ({ playbooks: state.playbooks.filter(r => r.id !== id) }))
  },

  duplicatePlaybook: async (id) => {
    const dup = await window.api.duplicatePlaybook(id)
    set(state => ({ playbooks: [...state.playbooks, dup] }))
    return dup
  },

  setExecutions: (list) => {
    const record: Record<string, PlaybookExecution> = {}
    list.forEach(e => { record[e.id] = e })
    set({ executions: record })
  },

  updateExecution: (execution) => {
    set(state => ({
      executions: { ...state.executions, [execution.id]: execution }
    }))
  },

  removeExecution: (executionId) => {
    set(state => {
      const { [executionId]: _, ...rest } = state.executions
      return { executions: rest }
    })
  }
}))
