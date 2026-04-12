import { create } from 'zustand'
import type { SystemMetrics } from '../../../shared/types'

const HISTORY_CAP = 30

interface HistoryPoint {
  t: number
  cpu: number
  mem: number
}

interface SystemMetricsState {
  current: SystemMetrics | null
  history: HistoryPoint[]
  initialized: boolean
  initialize: () => void
}

function toPoint(m: SystemMetrics): HistoryPoint {
  return { t: m.timestamp, cpu: m.cpu.total, mem: m.memory.totalMB }
}

export const useSystemMetricsStore = create<SystemMetricsState>((set, get) => ({
  current: null,
  history: [],
  initialized: false,

  initialize: () => {
    if (get().initialized) return
    set({ initialized: true })

    window.api
      .getSystemMetrics()
      .then((snap) => {
        if (snap) set({ current: snap, history: [toPoint(snap)] })
      })
      .catch(() => {
        /* snapshot not ready yet — push updates will populate */
      })

    window.api.onSystemMetricsUpdate((metrics) => {
      set((state) => {
        const next = state.history.length >= HISTORY_CAP
          ? [...state.history.slice(1), toPoint(metrics)]
          : [...state.history, toPoint(metrics)]
        return { current: metrics, history: next }
      })
    })
  }
}))
