import { useState, useCallback, useEffect, useRef } from 'react'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useGitStore } from '../../stores/useGitStore'

interface BranchSwitcherProps {
  projectPath: string
  branch: string
  onRefresh: () => void
}

export function BranchSwitcher({ projectPath, branch, onRefresh }: BranchSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  // Fetch branches on open
  useEffect(() => {
    if (!open || !projectPath) return
    window.api.gitExec({ projectPath, commands: ['git branch --format=%(refname:short)'] })
      .then(result => {
        if (result.success && result.steps[0]?.stdout) {
          setBranches(result.steps[0].stdout.trim().split('\n').filter(Boolean))
        }
      })
  }, [open, projectPath])

  const handleSwitch = useCallback(async (target: string) => {
    if (!projectPath || target === branch) {
      setOpen(false)
      return
    }
    setSwitching(true)
    try {
      await useGitStore.getState().execCommands(projectPath, [`git checkout ${target}`])
      onRefresh()
    } finally {
      setSwitching(false)
      setOpen(false)
    }
  }, [projectPath, branch, onRefresh])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 text-xs text-turbo-text-dim
                   hover:text-turbo-text transition-colors"
      >
        <PaletteIcon icon="git-branch" className="w-3 h-3" />
        <span className="truncate max-w-[120px]">{branch}</span>
        <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-turbo-surface border border-turbo-border
                        rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
          {branches.length === 0 ? (
            <p className="text-[10px] text-turbo-text-muted px-3 py-2">Loading...</p>
          ) : (
            branches.map(b => (
              <button
                key={b}
                onClick={() => handleSwitch(b)}
                disabled={switching}
                className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2
                           hover:bg-turbo-surface-hover transition-colors
                           disabled:opacity-40 ${b === branch ? 'text-turbo-accent font-medium' : 'text-turbo-text-dim'}`}
              >
                <PaletteIcon icon="git-branch" className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{b}</span>
                {b === branch && (
                  <svg className="w-3 h-3 ml-auto flex-shrink-0 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
