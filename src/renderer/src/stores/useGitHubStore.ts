import { create } from 'zustand'
import type {
  GitHubUser,
  GitHubOrg,
  GitHubAuthSource,
  GitHubConnectionStatus,
  GitHubTokenValidation
} from '../../../shared/types'

interface GitHubState {
  connected: boolean
  source: GitHubAuthSource | null
  user: GitHubUser | null
  orgs: GitHubOrg[]
  scopes: string[]
  loading: boolean
  error: string | null
  initialized: boolean

  initialize: () => Promise<void>
  connectWithToken: (pat: string) => Promise<GitHubTokenValidation>
  disconnect: () => Promise<void>
  refreshStatus: () => Promise<void>
}

function applyStatus(status: GitHubConnectionStatus) {
  return {
    connected: status.connected,
    source: status.source,
    user: status.user,
    orgs: status.orgs,
    scopes: status.scopes
  }
}

export const useGitHubStore = create<GitHubState>((set, get) => ({
  connected: false,
  source: null,
  user: null,
  orgs: [],
  scopes: [],
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      const status = await window.api.githubConnectionStatus()
      set({ ...applyStatus(status), initialized: true, loading: false })
    } catch {
      set({ initialized: true, loading: false })
    }
  },

  connectWithToken: async (pat: string) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.githubSaveToken(pat)
      if (result.valid) {
        // Token validated — refresh full status (fetches orgs, no duplicate /user call
        // since getConnectionStatus is a single round-trip from the main process)
        const status = await window.api.githubConnectionStatus()
        set({ ...applyStatus(status), loading: false, error: null })
      } else {
        set({ loading: false, error: result.error || 'Invalid token' })
      }
      return result
    } catch (err) {
      const error = (err as Error).message
      set({ loading: false, error })
      return { valid: false, error }
    }
  },

  disconnect: async () => {
    set({ loading: true })
    try {
      await window.api.githubRemoveToken()
      // Re-check — gh CLI may still be available
      const status = await window.api.githubConnectionStatus()
      set({ ...applyStatus(status), loading: false, error: null })
    } catch {
      set({
        connected: false, source: null, user: null, orgs: [], scopes: [],
        loading: false
      })
    }
  },

  refreshStatus: async () => {
    try {
      const status = await window.api.githubConnectionStatus()
      set(applyStatus(status))
    } catch {
      // Ignore
    }
  }
}))
