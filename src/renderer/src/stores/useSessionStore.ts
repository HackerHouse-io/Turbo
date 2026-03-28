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
}

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
    set(state => ({
      sessions: { ...state.sessions, [session.id]: session }
    }))
  },

  removeSession: (sessionId) => {
    set(state => {
      const { [sessionId]: _, ...rest } = state.sessions
      return {
        sessions: rest,
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
      ]
    }))
  },

  dismissAttentionItem: (itemId) => {
    set(state => ({
      attentionItems: state.attentionItems.map(item =>
        item.id === itemId ? { ...item, dismissed: true } : item
      )
    }))
  }
}))
