import type { AgentStatus } from '../../../../shared/types'

interface ProgressBarProps {
  value: number // 0-100
  status?: AgentStatus
  className?: string
}

function barColor(status?: AgentStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-turbo-success'
    case 'error':
      return 'bg-turbo-error/60'
    case 'stopped':
      return 'bg-turbo-text-muted'
    case 'waiting_for_input':
      return 'bg-turbo-warning animate-pulse-gentle'
    default:
      return 'bg-turbo-accent'
  }
}

function trackDimmed(status?: AgentStatus): boolean {
  return status === 'error' || status === 'stopped'
}

export function ProgressBar({ value, status, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={`w-full h-1 rounded-full overflow-hidden ${trackDimmed(status) ? 'bg-turbo-surface-active/50' : 'bg-turbo-surface-active'} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor(status)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
