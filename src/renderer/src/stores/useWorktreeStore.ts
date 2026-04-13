import { create } from 'zustand'
import type { WorktreeInfo } from '../../../shared/types'

const STORAGE_KEY = 'turbo:activeWorktrees'

function loadPersistedActive(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistActive(map: Record<string, string | null>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch { /* best-effort */ }
}

interface WorktreeState {
  /** Cached worktree list per project root path */
  worktrees: Record<string, WorktreeInfo[]>
  /** Active worktree path per project root path — null means main repo */
  activeWorktreePath: Record<string, string | null>
  /** Loading state per project */
  loading: Record<string, boolean>

  fetchWorktrees: (projectPath: string) => Promise<void>
  setActiveWorktree: (projectPath: string, worktreePath: string | null) => void
  createAndActivateWorktree: (projectPath: string, slug: string) => Promise<WorktreeInfo>
  removeWorktree: (projectPath: string, worktreePath: string, deleteBranch?: boolean) => Promise<void>
}

export const useWorktreeStore = create<WorktreeState>((set, get) => ({
  worktrees: {},
  activeWorktreePath: loadPersistedActive(),
  loading: {},

  fetchWorktrees: async (projectPath: string) => {
    set(s => ({ loading: { ...s.loading, [projectPath]: true } }))
    try {
      const list = await window.api.listWorktrees(projectPath)
      set(s => ({ worktrees: { ...s.worktrees, [projectPath]: list } }))

      // If the active worktree path no longer exists in the list, fall back to main
      const active = get().activeWorktreePath[projectPath]
      if (active && !list.some(w => w.path === active)) {
        const next = { ...get().activeWorktreePath, [projectPath]: null }
        set({ activeWorktreePath: next })
        persistActive(next)
      }
    } finally {
      set(s => ({ loading: { ...s.loading, [projectPath]: false } }))
    }
  },

  setActiveWorktree: (projectPath: string, worktreePath: string | null) => {
    const next = { ...get().activeWorktreePath, [projectPath]: worktreePath }
    set({ activeWorktreePath: next })
    persistActive(next)
  },

  createAndActivateWorktree: async (projectPath: string, slug: string) => {
    const info = await window.api.createWorktree({ projectPath, slug })
    // Refresh list and set active
    await get().fetchWorktrees(projectPath)
    get().setActiveWorktree(projectPath, info.path)
    return info
  },

  removeWorktree: async (projectPath: string, worktreePath: string, deleteBranch = false) => {
    await window.api.removeWorktree(worktreePath, deleteBranch)
    // If we removed the active worktree, fall back to main
    if (get().activeWorktreePath[projectPath] === worktreePath) {
      get().setActiveWorktree(projectPath, null)
    }
    await get().fetchWorktrees(projectPath)
  }
}))
