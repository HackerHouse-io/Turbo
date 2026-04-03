import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaletteIcon } from '../command-palette/PaletteIcon'

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
      await window.api.gitExec({ projectPath, commands: [`git checkout ${target}`] })
      onRefresh()
    } finally {
      setSwitching(false)
      setOpen(false)
    }
  }, [projectPath, branch, onRefresh])

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
                        rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto origin-top-right"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
