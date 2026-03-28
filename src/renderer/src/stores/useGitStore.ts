import { create } from 'zustand'
import type { GitAIMessageResult, GitCommandResult, GitWorkflowResult } from '../../../shared/types'

interface PendingCommit {
  message: string
  diffStat: string
  pushAfter: boolean
}

interface GitState {
  gitLoading: boolean
  gitError: string | null
  gitSuccess: string | null
  pendingCommit: PendingCommit | null

  setPendingCommit: (pending: PendingCommit | null) => void
  clearStatus: () => void

  stageAll: (projectPath: string) => Promise<GitCommandResult>
  commit: (projectPath: string, message: string) => Promise<GitCommandResult>
  push: (projectPath: string) => Promise<GitCommandResult>
  pullRebase: (projectPath: string) => Promise<GitCommandResult>
  generateAIMessage: (projectPath: string) => Promise<GitAIMessageResult | null>
  execCommands: (projectPath: string, commands: string[]) => Promise<GitWorkflowResult>
}

export const useGitStore = create<GitState>((set) => ({
  gitLoading: false,
  gitError: null,
  gitSuccess: null,
  pendingCommit: null,

  setPendingCommit: (pending) => set({ pendingCommit: pending }),
  clearStatus: () => set({ gitError: null, gitSuccess: null }),

  stageAll: async (projectPath) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    const result = await window.api.gitStageAll(projectPath)
    set({
      gitLoading: false,
      gitSuccess: result.success ? 'Staged all changes' : null,
      gitError: result.success ? null : result.stderr || 'Stage failed'
    })
    return result
  },

  commit: async (projectPath, message) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    const result = await window.api.gitCommit({ projectPath, message })
    set({
      gitLoading: false,
      gitSuccess: result.success ? 'Committed successfully' : null,
      gitError: result.success ? null : result.stderr || 'Commit failed'
    })
    return result
  },

  push: async (projectPath) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    const result = await window.api.gitPush(projectPath)
    set({
      gitLoading: false,
      gitSuccess: result.success ? 'Pushed successfully' : null,
      gitError: result.success ? null : result.stderr || 'Push failed'
    })
    return result
  },

  pullRebase: async (projectPath) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    const result = await window.api.gitPullRebase(projectPath)
    set({
      gitLoading: false,
      gitSuccess: result.success ? 'Pull & rebase complete' : null,
      gitError: result.success ? null : result.stderr || 'Pull failed'
    })
    return result
  },

  generateAIMessage: async (projectPath) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    try {
      const result = await window.api.gitAIMessage(projectPath)
      set({ gitLoading: false })
      if (!result.message) {
        set({ gitError: 'No changes to commit' })
        return null
      }
      return result
    } catch {
      set({ gitLoading: false, gitError: 'Failed to generate commit message' })
      return null
    }
  },

  execCommands: async (projectPath, commands) => {
    set({ gitLoading: true, gitError: null, gitSuccess: null })
    const result = await window.api.gitExec({ projectPath, commands })
    set({
      gitLoading: false,
      gitSuccess: result.success ? 'Commands completed' : null,
      gitError: result.success ? null : result.steps[result.abortedAt ?? 0]?.stderr || 'Command failed'
    })
    return result
  }
}))
