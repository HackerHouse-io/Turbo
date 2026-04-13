import { useState, useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useGitActionsStore } from '../../stores/useGitActionsStore'
import { useWorktreeStore } from '../../stores/useWorktreeStore'
import type { WorktreeInfo } from '../../../../shared/types'

interface BranchSwitcherProps {
  /** The raw project root path (not worktree path) */
  projectPath: string
  /** Current branch name from git status polling */
  branch: string
  onRefresh: () => void
}

export function BranchSwitcher({ projectPath, branch, onRefresh }: BranchSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const setError = useGitActionsStore(s => s.setError)

  const worktrees = useWorktreeStore(useShallow(s => s.worktrees[projectPath] ?? []))
  const activeWorktreePath = useWorktreeStore(s => s.activeWorktreePath[projectPath] ?? null)
  const setActiveWorktree = useWorktreeStore(s => s.setActiveWorktree)
  const fetchWorktrees = useWorktreeStore(s => s.fetchWorktrees)
  const removeWorktree = useWorktreeStore(s => s.removeWorktree)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fetch worktrees when dropdown opens
  useEffect(() => {
    if (!open || !projectPath) return
    fetchWorktrees(projectPath)
  }, [open, projectPath, fetchWorktrees])

  const handleSwitchToMain = useCallback(() => {
    setActiveWorktree(projectPath, null)
    setOpen(false)
    onRefresh()
  }, [projectPath, setActiveWorktree, onRefresh])

  const handleSwitchToWorktree = useCallback((wt: WorktreeInfo) => {
    if (wt.path === activeWorktreePath) {
      setOpen(false)
      return
    }
    setActiveWorktree(projectPath, wt.path)
    setOpen(false)
    onRefresh()
  }, [projectPath, activeWorktreePath, setActiveWorktree, onRefresh])

  const handleRemoveWorktree = useCallback(async (e: React.MouseEvent, wt: WorktreeInfo) => {
    e.stopPropagation()
    setRemoving(wt.path)
    try {
      await removeWorktree(projectPath, wt.path, true)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove worktree')
    } finally {
      setRemoving(null)
    }
  }, [projectPath, removeWorktree, onRefresh, setError])

  const isOnMain = activeWorktreePath === null

  return (
    <div className="relative" ref={ref}>
      <motion.button
        layout
        transition={{ layout: { duration: 0.15, ease: 'easeOut' } }}
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 text-xs text-turbo-text-dim
                   hover:text-turbo-text transition-colors"
      >
        <PaletteIcon icon="git-branch" className="w-3 h-3 flex-shrink-0" />
        <AnimatePresence mode="wait">
          <motion.span
            key={branch}
            className="truncate max-w-[200px] inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {branch}
          </motion.span>
        </AnimatePresence>
        <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-1 min-w-[200px] w-max max-w-[320px] bg-turbo-surface border border-turbo-border
                        rounded-lg shadow-xl z-20 py-1 max-h-60 overflow-y-auto origin-top-right"
          >
            {/* Main branch entry */}
            <button
              onClick={handleSwitchToMain}
              className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2
                         hover:bg-turbo-surface-hover transition-colors
                         ${isOnMain ? 'text-turbo-accent font-medium' : 'text-turbo-text-dim'}`}
            >
              <PaletteIcon icon="git-branch" className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">main</span>
              {isOnMain && (
                <svg className="w-3 h-3 ml-auto flex-shrink-0 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>

            {/* Worktrees section */}
            {worktrees.length > 0 && (
              <>
                <div className="border-t border-turbo-border/20 my-1" />
                <p className="text-[9px] text-turbo-text-muted px-3 py-1 uppercase tracking-wider">Worktrees</p>
                {worktrees.map(wt => {
                  const isActive = wt.path === activeWorktreePath
                  const isBeingRemoved = removing === wt.path
                  return (
                    <button
                      key={wt.path}
                      onClick={() => handleSwitchToWorktree(wt)}
                      disabled={isBeingRemoved}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 group
                                 hover:bg-turbo-surface-hover transition-colors
                                 disabled:opacity-40 ${isActive ? 'text-turbo-accent font-medium' : 'text-turbo-text-dim'}`}
                    >
                      <PaletteIcon icon="git-branch" className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate flex-1">{wt.branch}</span>
                      {isActive && (
                        <svg className="w-3 h-3 flex-shrink-0 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                      {/* Remove button — visible on hover, hidden for active to avoid accidental clicks */}
                      <button
                        onClick={(e) => handleRemoveWorktree(e, wt)}
                        className="w-3.5 h-3.5 flex-shrink-0 rounded text-turbo-text-muted hover:text-red-400
                                   opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove worktree"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </button>
                  )
                })}
              </>
            )}

            {worktrees.length === 0 && (
              <p className="text-[10px] text-turbo-text-muted px-3 py-2">
                Toggle "New Branch" in the prompt to create a worktree
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
