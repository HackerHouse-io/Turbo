import { create } from 'zustand'
import type { RoutineExecution } from '../../../shared/types'

interface RoutineState {
  executions: Record<string, RoutineExecution>
  setExecutions: (list: RoutineExecution[]) => void
  updateExecution: (execution: RoutineExecution) => void
  removeExecution: (executionId: string) => void
}

export const useRoutineStore = create<RoutineState>((set) => ({
  executions: {},

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
