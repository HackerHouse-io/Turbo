import type { AgentStatus, AttentionType } from '../../../../shared/types'

interface StatusBadgeProps {
  status: AgentStatus
  needsAttention?: boolean
  attentionType?: AttentionType
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; dot: string }> = {
  starting: {
    label: 'Starting',
    color: 'bg-turbo-info/10 text-turbo-info border-turbo-info/20',
    dot: 'bg-turbo-info'
  },
  active: {
    label: 'Working',
    color: 'bg-turbo-accent/10 text-turbo-accent border-turbo-accent/20',
    dot: 'bg-turbo-accent animate-pulse'
  },
  waiting_for_input: {
    label: 'Waiting',
    color: 'bg-turbo-warning/10 text-turbo-warning border-turbo-warning/20',
    dot: 'bg-turbo-warning'
  },
  paused: {
    label: 'Paused',
    color: 'bg-turbo-text-muted/10 text-turbo-text-muted border-turbo-text-muted/20',
    dot: 'bg-turbo-text-muted'
  },
  error: {
    label: 'Error',
    color: 'bg-turbo-error/10 text-turbo-error border-turbo-error/20',
    dot: 'bg-turbo-error'
  },
  completed: {
    label: 'Done',
    color: 'bg-turbo-success/10 text-turbo-success border-turbo-success/20',
    dot: 'bg-turbo-success'
  },
  stopped: {
    label: 'Stopped',
    color: 'bg-turbo-text-muted/10 text-turbo-text-muted border-turbo-text-muted/20',
    dot: 'bg-turbo-text-muted'
  }
}

const ATTENTION_CONFIG: Record<AttentionType, { label: string; color: string; dot: string }> = {
  decision: {
    label: 'Decision',
    color: 'bg-turbo-warning/10 text-turbo-warning border-turbo-warning/20',
    dot: 'bg-turbo-warning'
  },
  stuck: {
    label: 'Stuck',
    color: 'bg-turbo-error/10 text-turbo-error border-turbo-error/20',
    dot: 'bg-turbo-error animate-pulse'
  },
  error: {
    label: 'Error',
    color: 'bg-turbo-error/10 text-turbo-error border-turbo-error/20',
    dot: 'bg-turbo-error'
  },
  completed: {
    label: 'Done',
    color: 'bg-turbo-success/10 text-turbo-success border-turbo-success/20',
    dot: 'bg-turbo-success'
  },
  review: {
    label: 'Review',
    color: 'bg-turbo-success/10 text-turbo-success border-turbo-success/20',
    dot: 'bg-turbo-success'
  }
}

export function StatusBadge({ status, needsAttention, attentionType, size = 'sm' }: StatusBadgeProps) {
  const config = needsAttention && attentionType
    ? ATTENTION_CONFIG[attentionType]
    : STATUS_CONFIG[status]

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5'

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full border font-medium ${config.color}`}>
      <span className={`${dotSize} rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
