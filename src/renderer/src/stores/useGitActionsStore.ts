import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'

type ActionName = 'commit' | 'push' | 'pull' | 'ship'

interface GitActionsState {
  loading: Record<ActionName, boolean>
  lastMessage: string | null
  lastError: string | null
  busy: boolean

  quickCommit: () => Promise<void>
  push: () => Promise<void>
  pull: () => Promise<void>
  shipIt: () => Promise<void>
  clearStatus: () => void
}

function getProjectPath(): string | undefined {
  const s = useProjectStore.getState()
  const proj = s.projects.find(p => p.id === s.selectedProjectId)
  return proj?.path
}

async function stageAndCommit(path: string): Promise<string> {
  const stageResult = await window.api.gitStageAll(path)
  if (!stageResult.success) throw new Error(stageResult.stderr || 'Failed to stage files')

  const ai = await window.api.gitAIMessage(path)
  if (!ai.message) throw new Error('No changes to commit')

  const commitResult = await window.api.gitCommit({ projectPath: path, message: ai.message })
  if (!commitResult.success) throw new Error(commitResult.stderr || 'Commit failed')

  return ai.message
}

export const useGitActionsStore = create<GitActionsState>((set, get) => ({
  loading: { commit: false, push: false, pull: false, ship: false },
  lastMessage: null,
  lastError: null,
  busy: false,

  clearStatus: () => set({ lastMessage: null, lastError: null }),

  quickCommit: async () => {
    const path = getProjectPath()
    if (!path || get().busy) return
    set({ busy: true, loading: { ...get().loading, commit: true }, lastError: null })
    try {
      const message = await stageAndCommit(path)
      set({ lastMessage: message })
    } catch (err: unknown) {
      set({ lastError: (err as Error).message })
    } finally {
      set({ busy: false, loading: { ...get().loading, commit: false } })
    }
  },

  push: async () => {
    const path = getProjectPath()
    if (!path || get().busy) return
    set({ busy: true, loading: { ...get().loading, push: true }, lastError: null })
    try {
      const result = await window.api.gitPush(path)
      if (!result.success) throw new Error(result.stderr || 'Push failed')
      set({ lastMessage: 'Pushed successfully' })
    } catch (err: unknown) {
      set({ lastError: (err as Error).message })
    } finally {
      set({ busy: false, loading: { ...get().loading, push: false } })
    }
  },

  pull: async () => {
    const path = getProjectPath()
    if (!path || get().busy) return
    set({ busy: true, loading: { ...get().loading, pull: true }, lastError: null })
    try {
      const result = await window.api.gitPullRebase(path)
      if (!result.success) throw new Error(result.stderr || 'Pull failed')
      set({ lastMessage: 'Pulled & rebased' })
    } catch (err: unknown) {
      set({ lastError: (err as Error).message })
    } finally {
      set({ busy: false, loading: { ...get().loading, pull: false } })
    }
  },

  shipIt: async () => {
    const path = getProjectPath()
    if (!path || get().busy) return
    set({ busy: true, loading: { ...get().loading, ship: true }, lastError: null })
    try {
      const message = await stageAndCommit(path)
      const pushResult = await window.api.gitPush(path)
      if (!pushResult.success) throw new Error(pushResult.stderr || 'Push failed')
      set({ lastMessage: message })
    } catch (err: unknown) {
      set({ lastError: (err as Error).message })
    } finally {
      set({ busy: false, loading: { ...get().loading, ship: false } })
    }
  }
}))
