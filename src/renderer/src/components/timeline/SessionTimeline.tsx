import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { TimelineRow, BLOCK_COLORS } from './TimelineRow'
import { useSharedTick } from '../../hooks/useSharedTick'
import type { ActivityBlockType } from '../../../../shared/types'

// ─── Legend derived from shared BLOCK_COLORS ────────────────────

const LEGEND_TYPES: { type: ActivityBlockType; label: string }[] = [
  { type: 'read', label: 'Read' },
  { type: 'edit', label: 'Edit' },
  { type: 'write', label: 'Write' },
  { type: 'bash', label: 'Bash' },
  { type: 'search', label: 'Search' },
  { type: 'think', label: 'Think' },
  { type: 'tool', label: 'Tool' },
  { type: 'plan', label: 'Plan' }
]

// ─── Tick interval selection ────────────────────────────────────

const TICK_INTERVALS = [5_000, 10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000]

function pickTickInterval(range: number): number {
  for (const interval of TICK_INTERVALS) {
    const ticks = Math.floor(range / interval)
    if (ticks >= 4 && ticks <= 12) return interval
  }
  return TICK_INTERVALS[TICK_INTERVALS.length - 1]
}

function formatTickLabel(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  const remainMin = min % 60
  return remainMin > 0 ? `${hr}h${remainMin}m` : `${hr}h`
}

// ─── Component ──────────────────────────────────────────────────

export function SessionTimeline() {
  const closeTimeline = useUIStore(s => s.closeTimeline)
  const selectSession = useSessionStore(s => s.selectSession)
  const pinSession = useSessionStore(s => s.pinSession)
  const focusSession = useSessionStore(s => s.focusSession)
  const sessionsRecord = useSessionStore(s => s.sessions)

  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Filter sessions by selected project and sort by startedAt
  const sessions = useMemo(() => {
    const all = Object.values(sessionsRecord)
    const filtered = selectedProject
      ? all.filter(s => s.projectPath === selectedProject.path)
      : all
    return filtered.sort((a, b) => a.startedAt - b.startedAt)
  }, [sessionsRecord, selectedProject])

  const now = useSharedTick()

  // Compute global time range
  const { minStart, maxEnd } = useMemo(() => {
    if (sessions.length === 0) return { minStart: now, maxEnd: now }
    const minStart = sessions[0].startedAt
    const maxEnd = Math.max(
      ...sessions.map(s => s.completedAt || now)
    )
    return { minStart, maxEnd }
  }, [sessions, now])

  const totalRange = maxEnd - minStart || 1

  // Time axis ticks
  const ticks = useMemo(() => {
    if (sessions.length === 0) return []
    const interval = pickTickInterval(totalRange)
    const result: { offset: number; label: string }[] = []
    let t = 0
    while (t <= totalRange) {
      result.push({ offset: (t / totalRange) * 100, label: formatTickLabel(t) })
      t += interval
    }
    return result
  }, [totalRange, sessions.length])

  // "Now" marker position (only show if any session is active)
  const hasActive = sessions.some(s => s.status === 'active' || s.status === 'starting')
  const nowOffset = hasActive ? ((now - minStart) / totalRange) * 100 : null

  const handleSessionClick = useCallback((sessionId: string) => {
    selectSession(sessionId)
    pinSession(sessionId)
    focusSession(sessionId)
    closeTimeline()
  }, [selectSession, pinSession, focusSession, closeTimeline])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex flex-col bg-turbo-bg"
    >
      {/* Title bar spacer */}
      <div className="drag-region h-8 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-turbo-border flex-shrink-0">
        <PaletteIcon icon="clock" className="w-4 h-4 text-turbo-accent" />
        <h2 className="text-sm font-medium text-turbo-text">Session Timeline</h2>

        {/* Legend */}
        <div className="flex-1 flex items-center gap-3 ml-4 overflow-x-auto">
          {LEGEND_TYPES.map(item => (
            <div key={item.type} className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-sm ${BLOCK_COLORS[item.type]}`} />
              <span className="text-[10px] text-turbo-text-muted">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Shortcut hint */}
        <kbd className="kbd text-[10px]">⌘⇧T</kbd>

        {/* Close button */}
        <button
          onClick={closeTimeline}
          className="p-1.5 rounded-lg hover:bg-turbo-surface-active text-turbo-text-muted hover:text-turbo-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {sessions.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <PaletteIcon icon="clock" className="w-10 h-10 text-turbo-text-muted" />
            <p className="text-sm text-turbo-text-muted">No sessions yet</p>
            <p className="text-xs text-turbo-text-muted">Start a task to see the timeline</p>
          </div>
        ) : (
          <>
            {/* Time axis */}
            <div className="flex-shrink-0 flex h-6 border-b border-turbo-border">
              {/* Left spacer matching row label width */}
              <div className="w-[200px] flex-shrink-0" />
              {/* Axis area */}
              <div className="flex-1 relative px-2">
                {ticks.map((tick, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${tick.offset}%` }}
                  >
                    <div className="w-px h-2 bg-turbo-border" />
                    <span className="text-[9px] text-turbo-text-muted mt-0.5">{tick.label}</span>
                  </div>
                ))}
                {/* "Now" marker */}
                {nowOffset !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-turbo-accent"
                    style={{ left: `${nowOffset}%` }}
                  />
                )}
              </div>
            </div>

            {/* Session rows */}
            <div className="flex-1 overflow-y-auto">
              {sessions.map(session => (
                <TimelineRow
                  key={session.id}
                  session={session}
                  totalRange={totalRange}
                  minStart={minStart}
                  now={now}
                  onSessionClick={handleSessionClick}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
