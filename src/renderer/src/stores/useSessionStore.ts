import { create } from 'zustand'
import type { AgentSession, AttentionItem } from '../../../shared/types'

interface SessionState {
  sessions: Record<string, AgentSession>
  attentionItems: AttentionItem[]
  selectedSessionId: string | null

  // Actions
  setSessions: (sessions: AgentSession[]) => void
  updateSession: (session: AgentSession) => void
  removeSession: (sessionId: string) => void
  selectSession: (sessionId: string | null) => void
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

  setSessions: (sessions) => {
    const record: Record<string, AgentSession> = {}
    sessions.forEach(s => { record[s.id] = s })
    set({ sessions: record })
  },

  updateSession: (session) => {
    set(state => {
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
