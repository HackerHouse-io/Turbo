import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { AgentSession, AttentionItem } from '../../../shared/types'

interface SessionState {
  sessions: Record<string, AgentSession>
  attentionItems: AttentionItem[]
  selectedSessionId: string | null
  focusedSessionId: string | null      // Which terminal pane is focused
  pinnedSessionIds: string[]           // Sessions pinned to terminal grid

  // Actions
  setSessions: (sessions: AgentSession[]) => void
  updateSession: (session: AgentSession) => void
  removeSession: (sessionId: string) => void
  selectSession: (sessionId: string | null) => void
  focusSession: (sessionId: string | null) => void
  pinSession: (sessionId: string) => void
  unpinSession: (sessionId: string) => void
  addAttentionItem: (item: AttentionItem) => void
  dismissAttentionItem: (itemId: string) => void
  markItemRead: (itemId: string) => void
  markAllRead: () => void
  clearAllNotifications: () => void
}

const MAX_ATTENTION_ITEMS = 200

export const useSessionStore = create<SessionState>((set) => ({
  sessions: {},
  attentionItems: [],
  selectedSessionId: null,
  focusedSessionId: null,
  pinnedSessionIds: [],

  setSessions: (sessions) => {
    const record: Record<string, AgentSession> = {}
    sessions.forEach(s => { record[s.id] = s })
    set({ sessions: record })
  },

  updateSession: (session) => {
    set(state => {
      // Short-circuit: skip update if nothing meaningful changed
      const prev = state.sessions[session.id]
      if (prev &&
        prev.status === session.status &&
        prev.tokenCount === session.tokenCount &&
        prev.estimatedCost === session.estimatedCost &&
        prev.activityBlocks.length === session.activityBlocks.length &&
        prev.needsAttention === session.needsAttention &&
        prev.currentAction === session.currentAction &&
        prev.lastActivity === session.lastActivity &&
        prev.completedAt === session.completedAt
      ) {
        return state
      }

      // Auto-dismiss stale attention items when session no longer needs attention
      // Only map if there are actually items to dismiss (avoid no-op re-renders)
      let attentionItems = state.attentionItems
      if (!session.needsAttention && attentionItems.some(i => i.sessionId === session.id && !i.dismissed)) {
        attentionItems = attentionItems.map(item =>
          item.sessionId === session.id && !item.dismissed
            ? { ...item, dismissed: true }
            : item
        )
      }

      return {
        sessions: { ...state.sessions, [session.id]: session },
        attentionItems
      }
    })
  },

  removeSession: (sessionId) => {
    set(state => {
      const { [sessionId]: _, ...rest } = state.sessions
      return {
        sessions: rest,
        // Prune attention items for the removed session
        attentionItems: state.attentionItems.filter(i => i.sessionId !== sessionId),
        selectedSessionId:
          state.selectedSessionId === sessionId ? null : state.selectedSessionId
      }
    })
  },

  selectSession: (sessionId) => {
    set({ selectedSessionId: sessionId })
  },

  focusSession: (sessionId) => {
    set({ focusedSessionId: sessionId })
  },

  pinSession: (sessionId) => {
    set(state => {
      if (state.pinnedSessionIds.includes(sessionId)) return state
      return { pinnedSessionIds: [...state.pinnedSessionIds, sessionId].slice(0, 4) }
    })
  },

  unpinSession: (sessionId) => {
    set(state => ({
      pinnedSessionIds: state.pinnedSessionIds.filter(id => id !== sessionId)
    }))
  },

  addAttentionItem: (item) => {
    set(state => ({
      attentionItems: [
        item,
        ...state.attentionItems.map(existing =>
          existing.sessionId === item.sessionId && !existing.dismissed
            ? { ...existing, dismissed: true }
            : existing
        )
      ].slice(0, MAX_ATTENTION_ITEMS)
    }))
  },

  dismissAttentionItem: (itemId) => {
    set(state => ({
      attentionItems: state.attentionItems.map(item =>
        item.id === itemId && !item.dismissed ? { ...item, dismissed: true } : item
      )
    }))
  },

  markItemRead: (itemId) => {
    set(state => ({
      attentionItems: state.attentionItems.map(item =>
        item.id === itemId && !item.read ? { ...item, read: true } : item
      )
    }))
  },

  markAllRead: () => {
    set(state => ({
      attentionItems: state.attentionItems.map(item =>
        item.read ? item : { ...item, read: true }
      )
    }))
  },

  clearAllNotifications: () => {
    set(state => ({
      attentionItems: state.attentionItems.map(item =>
        item.dismissed ? item : { ...item, dismissed: true }
      )
    }))
  }
}))

// ─── Granular Selectors ─────────────────────────────────────────
// These prevent re-renders when unrelated sessions change.

/** Returns sessions filtered by project path — shallow-compared array. */
export function useProjectSessions(projectPath: string | undefined): AgentSession[] {
  return useSessionStore(
    useShallow(s => {
      if (!projectPath) return []
      return Object.values(s.sessions).filter(sess => sess.projectPath === projectPath)
    })
  )
}

/** Returns session counts for a project — only re-renders when counts change. */
export function useSessionCounts(projectPath: string | undefined) {
  return useSessionStore(
    useShallow(s => {
      const all = projectPath
        ? Object.values(s.sessions).filter(sess => sess.projectPath === projectPath)
        : Object.values(s.sessions)
      let active = 0, waiting = 0, error = 0, done = 0, tokens = 0, cost = 0
      for (const sess of all) {
        if (sess.status === 'active' || sess.status === 'starting') active++
        else if (sess.status === 'waiting_for_input') waiting++
        else if (sess.status === 'error') error++
        else if (sess.status === 'completed' || sess.status === 'stopped') done++
        tokens += sess.tokenCount
        cost += sess.estimatedCost
      }
      return { active, waiting, error, done, tokens, cost }
    })
  )
}
