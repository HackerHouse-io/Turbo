import { memo } from 'react'
import type { AgentSession, ActivityBlockType } from '../../../../shared/types'
import { StatusBadge } from '../shared/StatusBadge'
import { formatElapsed, formatDuration } from '../../lib/format'

export const BLOCK_COLORS: Record<ActivityBlockType, string> = {
  read: 'bg-blue-500',
  edit: 'bg-emerald-500',
  write: 'bg-yellow-500',
  bash: 'bg-purple-500',
  search: 'bg-cyan-500',
  think: 'bg-indigo-400/50',
  message: 'bg-slate-500',
  tool: 'bg-orange-500',
  plan: 'bg-indigo-500',
  unknown: 'bg-slate-600'
}

interface TimelineRowProps {
  session: AgentSession
  totalRange: number
  minStart: number
  now: number
  onSessionClick: (sessionId: string) => void
}

export const TimelineRow = memo(function TimelineRow({ session, totalRange, minStart, now, onSessionClick }: TimelineRowProps) {
  const sessionEnd = session.completedAt || now
  const sessionStart = session.startedAt
  const sessionDuration = sessionEnd - sessionStart || 1

  // Bar position relative to global range
  const barLeft = ((sessionStart - minStart) / totalRange) * 100
  const barWidth = Math.max((sessionDuration / totalRange) * 100, 0.5)

  const elapsed = formatElapsed(session.startedAt, session.completedAt || undefined)
  const isActive = session.status === 'active' || session.status === 'starting'

  return (
    <div
      onClick={() => onSessionClick(session.id)}
      className="flex items-center gap-0 h-12 cursor-pointer hover:bg-turbo-surface-hover/50 transition-colors group"
    >
      {/* Left column: session info */}
      <div className="w-[200px] flex-shrink-0 flex items-center gap-2 px-3 overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-turbo-text truncate">{session.name}</span>
            <StatusBadge status={session.status} needsAttention={session.needsAttention} attentionType={session.attentionType} />
          </div>
          <p className="text-[10px] text-turbo-text-muted truncate mt-0.5">
            {session.prompt
              ? session.prompt.slice(0, 60) + (session.prompt.length > 60 ? '…' : '')
              : elapsed}
          </p>
        </div>
      </div>

      {/* Right column: Gantt bar */}
      <div className="flex-1 h-full relative px-2">
        {/* Session bar */}
        <div
          className={`absolute top-2 bottom-2 rounded-md ${
            isActive
              ? 'bg-turbo-accent/15 border border-turbo-accent/30'
              : 'bg-turbo-surface-active border border-turbo-border'
          } overflow-hidden`}
          style={{
            left: `${barLeft}%`,
            width: `${barWidth}%`,
            minWidth: '4px'
          }}
        >
          {/* Activity segments inside the bar */}
          {session.activityBlocks.map((block, i) => {
            const blockStart = block.timestamp - sessionStart
            // Estimate duration: use provided, or gap to next block, or to session end
            const blockDuration = block.duration
              || (i < session.activityBlocks.length - 1
                ? session.activityBlocks[i + 1].timestamp - block.timestamp
                : sessionEnd - block.timestamp)

            const segLeft = Math.max((blockStart / sessionDuration) * 100, 0)
            const segWidth = Math.max((blockDuration / sessionDuration) * 100, 0.5)

            return (
              <div
                key={block.id}
                className={`absolute top-0 bottom-0 ${BLOCK_COLORS[block.type]} opacity-80`}
                style={{
                  left: `${segLeft}%`,
                  width: `${segWidth}%`,
                  minWidth: '2px'
                }}
                title={`${block.type}: ${block.title} (${formatDuration(blockDuration)})`}
              />
            )
          })}

          {/* Active pulse indicator */}
          {isActive && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-turbo-accent animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
})
