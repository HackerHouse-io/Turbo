import { create } from 'zustand'
import type { Routine, RoutineExecution } from '../../../shared/types'

interface RoutineState {
  executions: Record<string, RoutineExecution>
  routines: Routine[]
  loadRoutines: () => Promise<void>
  saveRoutine: (routine: Routine) => Promise<Routine>
  deleteRoutine: (id: string) => Promise<void>
  duplicateRoutine: (id: string) => Promise<Routine>
  setExecutions: (list: RoutineExecution[]) => void
  updateExecution: (execution: RoutineExecution) => void
  removeExecution: (executionId: string) => void
}

export const useRoutineStore = create<RoutineState>((set) => ({
  executions: {},
  routines: [],

  loadRoutines: async () => {
    const routines = await window.api.listRoutines()
    set({ routines })
  },

  saveRoutine: async (routine) => {
    const saved = await window.api.saveRoutine(routine)
    set(state => ({
      routines: state.routines.some(r => r.id === saved.id)
        ? state.routines.map(r => r.id === saved.id ? saved : r)
        : [...state.routines, saved]
    }))
    return saved
  },

  deleteRoutine: async (id) => {
    await window.api.deleteRoutine(id)
    set(state => ({ routines: state.routines.filter(r => r.id !== id) }))
  },

  duplicateRoutine: async (id) => {
    const dup = await window.api.duplicateRoutine(id)
    set(state => ({ routines: [...state.routines, dup] }))
    return dup
  },

  setExecutions: (list) => {
    const record: Record<string, RoutineExecution> = {}
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
