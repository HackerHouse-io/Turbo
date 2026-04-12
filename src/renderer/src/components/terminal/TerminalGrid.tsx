import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XTermRenderer } from './XTermRenderer'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { useShallow } from 'zustand/react/shallow'
import { isTerminalStatus } from '../../../../shared/types'
import type { AgentSession } from '../../../../shared/types'
import { STATUS_DOT_COLORS, STATUS_LABELS } from '../../lib/sessionStatus'
import { useDropZone } from '../../hooks/useDropZone'
import { shellQuote } from '../../lib/format'
import { PaneLayout } from './PaneLayout'

function TerminalPane({ session, isFocused, onFocus, onClose, onExpand, paneRef, showExpand }: {
  session: AgentSession
  isFocused: boolean
  onFocus: () => void
  onClose: () => void
  onExpand?: () => void
  paneRef?: (el: HTMLDivElement | null) => void
  showExpand?: boolean
}) {
  const isActive = !isTerminalStatus(session.status)

  const handleFileDrop = useCallback((paths: string[]) => {
    window.api.sendTerminalInput(session.id, paths.map(shellQuote).join(' '))
  }, [session.id])

  const { isDragOver, dropProps } = useDropZone({ onDrop: handleFileDrop })

  return (
    <div
      ref={paneRef}
      onClick={onFocus}
      {...dropProps}
      className={`relative flex flex-col h-full rounded-lg overflow-hidden border transition-colors
        ${isFocused ? 'border-turbo-accent/50' : 'border-turbo-border/30 hover:border-turbo-border/60'}
      `}
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 flex-shrink-0 group/header
        ${isFocused ? 'bg-turbo-accent/10' : 'bg-turbo-surface/50'}
      `}>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[session.status]}`} />
        <span className="text-[11px] font-medium text-turbo-text truncate flex-1">
          {session.name}
        </span>
        <span className="text-[10px] text-turbo-text-muted">
          {STATUS_LABELS[session.status]}
        </span>
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.stopSession(session.id)
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/15 text-turbo-text-muted hover:text-red-400 transition-colors"
            title="Stop session"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        )}
        {showExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExpand?.()
            }}
            className="w-5 h-5 flex items-center justify-center rounded
                       text-turbo-text-muted hover:text-turbo-text hover:bg-white/[0.06]
                       opacity-0 group-hover/header:opacity-100 transition-all"
            title="Expand pane"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4l5 5M4 4v4m0-4h4M20 4l-5 5M20 4v4m0-4h-4M4 20l5-5M4 20v-4m0 4h4M20 20l-5-5M20 20v-4m0 4h-4" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="w-5 h-5 flex items-center justify-center rounded
                     text-turbo-text-muted hover:text-turbo-text hover:bg-white/[0.06]
                     opacity-0 group-hover/header:opacity-100 transition-all"
          title="Close pane"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <XTermRenderer
          terminalId={session.id}
          mode="session"
          showResume={!isActive}
          onResume={() => window.api.resumeSession(session.id)}
        />
      </div>

      {isDragOver && (
        <div className="absolute inset-0 z-10 bg-turbo-accent/10 border-2 border-dashed border-turbo-accent/50 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-turbo-accent bg-turbo-bg/80 px-3 py-1.5 rounded-lg">
            Drop to paste path
          </span>
        </div>
      )}
    </div>
  )
}

interface OverlayRect {
  top: number
  left: number
  width: number
  height: number
}

function ExpandedPaneOverlay({
  session,
  sourceRect,
  onCollapse,
}: {
  session: AgentSession
  sourceRect: OverlayRect
  onCollapse: () => void
}) {
  const isActive = !isTerminalStatus(session.status)

  return (
    <motion.div
      initial={{
        top: sourceRect.top,
        left: sourceRect.left,
        width: sourceRect.width,
        height: sourceRect.height,
      }}
      animate={{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      exit={{
        top: sourceRect.top,
        left: sourceRect.left,
        width: sourceRect.width,
        height: sourceRect.height,
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute z-[35] flex flex-col rounded-lg overflow-hidden border border-turbo-accent/50"
      style={{ background: '#0a0a0f' }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 group/header bg-turbo-accent/10">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[session.status]}`} />
        <span className="text-[11px] font-medium text-turbo-text truncate flex-1">
          {session.name}
        </span>
        <span className="text-[10px] text-turbo-text-muted">
          {STATUS_LABELS[session.status]}
        </span>
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.stopSession(session.id)
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/15 text-turbo-text-muted hover:text-red-400 transition-colors"
            title="Stop session"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCollapse()
          }}
          className="w-5 h-5 flex items-center justify-center rounded
                     text-turbo-text-muted hover:text-turbo-text hover:bg-white/[0.06]
                     transition-all"
          title="Minimize pane"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0v4m0-4h4M15 9l5-4m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4M15 15l5 5m0 0v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <XTermRenderer
          terminalId={session.id}
          mode="session"
          showResume={!isActive}
          onResume={() => window.api.resumeSession(session.id)}
        />
      </div>
    </motion.div>
  )
}

export function TerminalGrid() {
  const focusedSessionId = useSessionStore(s => s.focusedSessionId)
  const focusSession = useSessionStore(s => s.focusSession)
  const unpinSession = useSessionStore(s => s.unpinSession)
  const projectPath = useProjectStore(selectProjectPath)

  // Derive visible sessions with useShallow to avoid re-renders on unrelated session changes
  const visibleSessions = useSessionStore(
    useShallow(s => {
      if (!projectPath) return []
      const pinned = s.pinnedSessionIds
        .map(id => s.sessions[id])
        .filter((x): x is AgentSession => !!x && x.projectPath === projectPath)
      if (pinned.length > 0) return pinned.slice(0, 4)
      return Object.values(s.sessions)
        .filter(x => x.projectPath === projectPath && !isTerminalStatus(x.status))
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 4)
    })
  )

  const gridSplitRatios = useTerminalStore(s => s.gridSplitRatios)
  const setGridSplitRatio = useTerminalStore(s => s.setGridSplitRatio)
  const resetGridSplitRatios = useTerminalStore(s => s.resetGridSplitRatios)

  // ─── Expand/collapse state ──────────────────────────────────
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null)
  const paneRefs = useRef(new Map<string, HTMLDivElement>())
  const gridRef = useRef<HTMLDivElement>(null)

  const expandedSession = expandedSessionId
    ? visibleSessions.find(s => s.id === expandedSessionId) ?? null
    : null

  const handleExpand = useCallback((sessionId: string) => {
    const paneEl = paneRefs.current.get(sessionId)
    const gridEl = gridRef.current
    if (!paneEl || !gridEl) return

    const paneRect = paneEl.getBoundingClientRect()
    const gridRect = gridEl.getBoundingClientRect()

    setOverlayRect({
      top: paneRect.top - gridRect.top,
      left: paneRect.left - gridRect.left,
      width: paneRect.width,
      height: paneRect.height,
    })
    setExpandedSessionId(sessionId)
    focusSession(sessionId)
  }, [focusSession])

  const handleCollapse = useCallback(() => {
    if (!expandedSessionId) return

    // Re-measure source pane for accurate exit animation
    const paneEl = paneRefs.current.get(expandedSessionId)
    const gridEl = gridRef.current
    if (paneEl && gridEl) {
      const paneRect = paneEl.getBoundingClientRect()
      const gridRect = gridEl.getBoundingClientRect()
      setOverlayRect({
        top: paneRect.top - gridRect.top,
        left: paneRect.left - gridRect.left,
        width: paneRect.width,
        height: paneRect.height,
      })
    }
    setExpandedSessionId(null)
  }, [expandedSessionId])

  // Escape key: collapse expanded pane (capture phase, before AppShell handler)
  useEffect(() => {
    if (!expandedSessionId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleCollapse()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [expandedSessionId, handleCollapse])

  // Auto-collapse if expanded session disappears
  useEffect(() => {
    if (expandedSessionId && !visibleSessions.some(s => s.id === expandedSessionId)) {
      setExpandedSessionId(null)
      setOverlayRect(null)
    }
  }, [visibleSessions, expandedSessionId])

  const prevCount = useRef(visibleSessions.length)
  useEffect(() => {
    if (visibleSessions.length !== prevCount.current) {
      resetGridSplitRatios()
    }
    prevCount.current = visibleSessions.length
  }, [visibleSessions.length, resetGridSplitRatios])

  if (visibleSessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-turbo-surface border border-turbo-border/40
                          flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-turbo-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm text-turbo-text-dim mb-1">No active sessions</p>
          <p className="text-xs text-turbo-text-muted">
            Type what you want to work on below and hit <kbd className="kbd text-[10px] px-1 py-0.5">&#8984;&#8617;</kbd>
          </p>
        </div>
      </div>
    )
  }

  const canExpand = visibleSessions.length > 1

  return (
    <div ref={gridRef} className="relative flex-1 p-1 min-h-0">
      <PaneLayout
        panes={visibleSessions.map(session => (
          <TerminalPane
            key={session.id}
            session={session}
            isFocused={focusedSessionId === session.id}
            onFocus={() => focusSession(session.id)}
            onClose={() => unpinSession(session.id)}
            onExpand={() => handleExpand(session.id)}
            showExpand={canExpand}
            paneRef={(el) => {
              if (el) paneRefs.current.set(session.id, el)
              else paneRefs.current.delete(session.id)
            }}
          />
        ))}
        ratios={gridSplitRatios}
        onRatioChange={setGridSplitRatio}
      />

      <AnimatePresence>
        {expandedSession && overlayRect && (
          <ExpandedPaneOverlay
            key={expandedSession.id}
            session={expandedSession}
            sourceRect={overlayRect}
            onCollapse={handleCollapse}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
