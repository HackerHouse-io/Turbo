import { create } from 'zustand'
import type { GitIdentity, ResolvedGitIdentity } from '../../../shared/types'

interface GitIdentityState {
  globalIdentity: GitIdentity | null
  currentResolved: ResolvedGitIdentity | null
  initialized: boolean
  initialize: () => Promise<void>
  resolveForProject: (projectPath: string) => Promise<void>
  setGlobalOverride: (identity: GitIdentity) => Promise<void>
}

export const useGitIdentityStore = create<GitIdentityState>((set) => ({
  globalIdentity: null,
  currentResolved: null,
  initialized: false,

  initialize: async () => {
    const globalIdentity = await window.api.detectGlobalGitIdentity()
    set({ globalIdentity, initialized: true })
  },

  resolveForProject: async (projectPath: string) => {
    const currentResolved = await window.api.resolveGitIdentity(projectPath)
    set({ currentResolved })
  },

  setGlobalOverride: async (identity: GitIdentity) => {
    await window.api.setGlobalGitIdentity(identity)
    set({ globalIdentity: identity })
  }
}))
