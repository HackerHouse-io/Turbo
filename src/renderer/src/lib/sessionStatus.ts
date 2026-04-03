import type { AgentStatus } from '../../../shared/types'

/** Tailwind background classes for session status dots */
export const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  starting: 'bg-blue-400',
  active: 'bg-emerald-400',
  waiting_for_input: 'bg-amber-400',
  paused: 'bg-gray-400',
  error: 'bg-red-400',
  completed: 'bg-emerald-400/40',
  stopped: 'bg-gray-400/40'
}

/** Whether a status should show a pulse animation */
export const STATUS_ANIMATED: Partial<Record<AgentStatus, true>> = {
  active: true,
  starting: true,
  waiting_for_input: true
}

/** Human-readable status labels */
export const STATUS_LABELS: Record<AgentStatus, string> = {
  starting: 'Starting',
  active: 'Running',
  waiting_for_input: 'Waiting',
  paused: 'Paused',
  error: 'Error',
  completed: 'Done',
  stopped: 'Stopped'
}
