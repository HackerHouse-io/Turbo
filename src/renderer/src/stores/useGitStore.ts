import { create } from 'zustand'
import type { GitAIMessageResult, GitCommandResult, GitWorkflowResult } from '../../../shared/types'

interface PendingCommit {
  message: string
  diffStat: string
  pushAfter: boolean
}

interface GitState {
  gitLoading: boolean
  gitLoadingMessage: string | null
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
  gitLoadingMessage: null,
  gitError: null,
  gitSuccess: null,
  pendingCommit: null,

  setPendingCommit: (pending) => set({ pendingCommit: pending }),
  clearStatus: () => set({ gitError: null, gitSuccess: null }),

  stageAll: async (projectPath) => {
    set({ gitLoading: true, gitLoadingMessage: 'Staging...', gitError: null, gitSuccess: null })
    const result = await window.api.gitStageAll(projectPath)
    if (!result.success) {
      set({ gitLoading: false, gitLoadingMessage: null, gitError: result.stderr || 'Stage failed' })
      return result
    }
    // git add -A always exits 0 — check what's actually staged
    const diffResult = await window.api.gitExec({ projectPath, commands: ['git diff --stat --staged'] })
    const statOutput = diffResult.steps[0]?.stdout?.trim() ?? ''
    const fileCount = statOutput ? statOutput.split('\n').length - 1 : 0 // last line is summary
    set({
      gitLoading: false,
      gitLoadingMessage: null,
      gitSuccess: fileCount > 0 ? `Staged ${fileCount} file(s)` : 'Nothing to stage — working tree clean'
    })
    return result
  },

  commit: async (projectPath, message) => {
    set({ gitLoading: true, gitLoadingMessage: 'Committing...', gitError: null, gitSuccess: null })
    const result = await window.api.gitCommit({ projectPath, message })
    if (result.success) {
      set({ gitLoading: false, gitLoadingMessage: null, gitSuccess: 'Committed' })
    } else {
      const msg = (result.stderr || '').includes('nothing to commit') ? 'Nothing to commit' : result.stderr || 'Commit failed'
      set({ gitLoading: false, gitLoadingMessage: null, gitError: msg })
    }
    return result
  },

  push: async (projectPath) => {
    set({ gitLoading: true, gitLoadingMessage: 'Pushing...', gitError: null, gitSuccess: null })
    const result = await window.api.gitPush(projectPath)
    if (result.success) {
      const output = (result.stdout || '') + (result.stderr || '')
      const msg = output.includes('Everything up-to-date') ? 'Already up to date' : 'Pushed to remote'
      set({ gitLoading: false, gitLoadingMessage: null, gitSuccess: msg })
    } else {
      set({ gitLoading: false, gitLoadingMessage: null, gitError: result.stderr || 'Push failed' })
    }
    return result
  },

  pullRebase: async (projectPath) => {
    set({ gitLoading: true, gitLoadingMessage: 'Pulling...', gitError: null, gitSuccess: null })
    const result = await window.api.gitPullRebase(projectPath)
    if (result.success) {
      const output = (result.stdout || '') + (result.stderr || '')
      const msg = output.includes('Already up to date') ? 'Already up to date' : 'Pulled latest changes'
      set({ gitLoading: false, gitLoadingMessage: null, gitSuccess: msg })
    } else {
      set({ gitLoading: false, gitLoadingMessage: null, gitError: result.stderr || 'Pull failed' })
    }
    return result
  },

  generateAIMessage: async (projectPath) => {
    set({ gitLoading: true, gitLoadingMessage: 'Generating commit message...', gitError: null, gitSuccess: null })
    try {
      const result = await window.api.gitAIMessage(projectPath)
      set({ gitLoading: false, gitLoadingMessage: null })
      if (!result.message) {
        set({ gitError: 'Nothing to commit' })
        return null
      }
      return result
    } catch {
      set({ gitLoading: false, gitLoadingMessage: null, gitError: 'Failed to generate message' })
      return null
    }
  },

  execCommands: async (projectPath, commands) => {
    set({ gitLoading: true, gitLoadingMessage: 'Running...', gitError: null, gitSuccess: null })
    const result = await window.api.gitExec({ projectPath, commands })
    set({
      gitLoading: false,
      gitLoadingMessage: null,
      gitSuccess: result.success ? 'Commands completed' : null,
      gitError: result.success ? null : result.steps[result.abortedAt ?? 0]?.stderr || 'Command failed'
    })
    return result
  }
}))
