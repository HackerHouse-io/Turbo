import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AgentSession, AttentionType } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { AgentCard } from './AgentCard'
import { PaletteIcon } from '../command-palette/PaletteIcon'

const ATTENTION_PRIORITY: Record<AttentionType, number> = {
  error: 0,
  stuck: 1,
  decision: 2,
  review: 3,
  completed: 4,
}

export function SessionList({ sessions }: { sessions: AgentSession[] }) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)

  // Sort sessions
  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aAttention = a.needsAttention ? 1 : 0
      const bAttention = b.needsAttention ? 1 : 0

      // Attention items first
      if (aAttention !== bAttention) return bAttention - aAttention

      // Within attention items, sort by priority
      if (aAttention && bAttention) {
        const aPri = ATTENTION_PRIORITY[a.attentionType ?? 'completed'] ?? 4
        const bPri = ATTENTION_PRIORITY[b.attentionType ?? 'completed'] ?? 4
        if (aPri !== bPri) return aPri - bPri
      }

      // Group by status category
      const aCategory = statusCategory(a.status)
      const bCategory = statusCategory(b.status)
      if (aCategory !== bCategory) return aCategory - bCategory

      // Within category, sort by time
      if (aCategory <= 2) {
        // Active/waiting: newest first
        return b.startedAt - a.startedAt
      }
      // Completed: most recent first
      return (b.completedAt ?? b.startedAt) - (a.completedAt ?? a.startedAt)
    })
  }, [sessions])

  // Keyboard navigation
  const totalItems = sorted.length

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when focus is in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(i => Math.min(i + 1, totalItems - 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        if (focusedIndex < sorted.length) {
          selectSession(sorted[focusedIndex].id)
          setViewMode('detail')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, totalItems, sorted, selectSession, setViewMode])

  // Auto-scroll focused card into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return
    const rows = listRef.current.querySelectorAll('[data-session-row]')
    rows[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex])

  return (
    <div ref={listRef} className="px-4 py-3">
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
        Tasks
      </h3>
      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence initial={false}>
            {sorted.map((session, i) => (
              <motion.div
                key={session.id}
                data-session-row
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <AgentCard session={session} focused={focusedIndex === i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center gap-3 h-10 text-xs text-turbo-text-muted">
          <PaletteIcon icon="terminal" className="w-3.5 h-3.5 text-turbo-text-muted/50" />
          No active sessions — type a task below
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function statusCategory(status: AgentSession['status']): number {
  switch (status) {
    case 'active':
    case 'starting':
      return 1
    case 'waiting_for_input':
    case 'paused':
      return 2
    case 'completed':
    case 'stopped':
    case 'error':
      return 3
    default:
      return 4
  }
}
