import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCommandPaletteData } from '../command-palette/useCommandPaletteData'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useUIStore } from '../../stores/useUIStore'
import { useGitStore } from '../../stores/useGitStore'
import type { PromptTemplate, GitPreset } from '../../../../shared/types'

interface StatusEntry {
  code: string   // e.g. "M", "A", "D", "??"
  file: string
}

const STATUS_VISIBLE_LIMIT = 15

function parseStatusCode(code: string): { label: string; color: string; title: string } {
  switch (code) {
    case 'M': return { label: 'M', color: 'text-amber-400', title: 'Modified' }
    case 'A': return { label: 'A', color: 'text-emerald-400', title: 'Added' }
    case 'D': return { label: 'D', color: 'text-red-400', title: 'Deleted' }
    case 'R': return { label: 'R', color: 'text-blue-400', title: 'Renamed' }
    case 'C': return { label: 'C', color: 'text-blue-400', title: 'Copied' }
    case 'U': return { label: 'U', color: 'text-orange-400', title: 'Unmerged (conflict)' }
    case '??': return { label: '?', color: 'text-turbo-text-muted', title: 'Untracked' }
    default: return { label: code, color: 'text-turbo-text-muted', title: code }
  }
}

function parseGitStatus(raw: string): StatusEntry[] {
  return raw.trim().split('\n').filter(Boolean).map(line => {
    // git status --short format: XY filename
    // X = index status, Y = worktree status
    const index = line[0]
    const worktree = line[1]
    const file = line.slice(3)
    // Show the most relevant status: prefer worktree changes, fall back to index
    const code = line.startsWith('??') ? '??' : (worktree !== ' ' ? worktree : index)
    return { code, file }
  })
}

interface QuickActionsCardProps {
  projectPath: string
  branch: string | null
  onGitRefresh: () => void
}

export function QuickActionsCard({ projectPath, branch, onGitRefresh }: QuickActionsCardProps) {
  const { templates, gitPresets } = useCommandPaletteData()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openWithTemplate = useUIStore(s => s.openCommandPaletteWithTemplate)
  const gitLoading = useGitStore(s => s.gitLoading)
  const gitLoadingMessage = useGitStore(s => s.gitLoadingMessage)
  const gitSuccess = useGitStore(s => s.gitSuccess)
  const gitError = useGitStore(s => s.gitError)
  const clearStatus = useGitStore(s => s.clearStatus)

  // Branch dropdown state
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [localBranches, setLocalBranches] = useState<string[]>([])
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Git status panel state (separate from ephemeral toast)
  const [statusFiles, setStatusFiles] = useState<StatusEntry[] | null>(null)
  const [statusClean, setStatusClean] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    if (!branchDropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [branchDropdownOpen])

  // Fetch local branches when dropdown opens
  useEffect(() => {
    if (!branchDropdownOpen || !projectPath) return
    window.api.gitExec({ projectPath, commands: ['git branch --format=%(refname:short)'] })
      .then(result => {
        if (result.success && result.steps[0]?.stdout) {
          setLocalBranches(result.steps[0].stdout.trim().split('\n').filter(Boolean))
        }
      })
  }, [branchDropdownOpen, projectPath])

  const handleSwitchBranch = useCallback(async (targetBranch: string) => {
    if (!projectPath || targetBranch === branch) {
      setBranchDropdownOpen(false)
      return
    }
    setSwitching(true)
    try {
      await useGitStore.getState().execCommands(projectPath, [`git checkout ${targetBranch}`])
      onGitRefresh()
    } finally {
      setSwitching(false)
      setBranchDropdownOpen(false)
    }
  }, [projectPath, branch, onGitRefresh])

  // Auto-dismiss git toast after 3s
  useEffect(() => {
    if (!gitSuccess && !gitError) return
    const t = setTimeout(clearStatus, 3000)
    return () => clearTimeout(t)
  }, [gitSuccess, gitError, clearStatus])

  const handleTemplateClick = useCallback((t: PromptTemplate) => {
    if (t.variables.length > 0) {
      openWithTemplate(t)
      return
    }
    window.api.createSession({
      projectPath,
      prompt: t.template,
      name: t.name,
      model: 'sonnet',
      effort: t.effort ?? 'medium',
      permissionMode: t.permissionMode
    })
  }, [projectPath, openWithTemplate])

  const handleGitClick = useCallback(async (g: GitPreset) => {
    if (!projectPath) return
    const store = useGitStore.getState()

    if (g.flow === 'quick-commit' || g.flow === 'full-commit-push') {
      const pushAfter = g.flow === 'full-commit-push'
      const result = await store.generateAIMessage(projectPath)
      if (result) {
        store.setPendingCommit({
          message: result.message,
          diffStat: result.diffStat,
          pushAfter
        })
        openCommandPalette()
      }
      return
    }

    const cmd = g.commands[0] ?? ''
    if (cmd.startsWith('git add')) {
      await store.stageAll(projectPath)
    } else if (cmd.startsWith('git push')) {
      await store.push(projectPath)
    } else if (cmd.startsWith('git pull')) {
      await store.pullRebase(projectPath)
    } else {
      await store.execCommands(projectPath, g.commands)
    }
  }, [projectPath, openCommandPalette])

  const handleStatus = useCallback(async () => {
    if (!projectPath) return
    setStatusFiles(null)
    setStatusClean(false)
    setStatusLoading(true)
    try {
      const result = await window.api.gitExec({ projectPath, commands: ['git status --short'] })
      const output = result.steps[0]?.stdout?.trim()
      if (!result.success) {
        setStatusFiles(null)
        setStatusClean(false)
      } else if (!output) {
        setStatusFiles(null)
        setStatusClean(true)
      } else {
        setStatusFiles(parseGitStatus(output))
        setStatusClean(false)
      }
    } catch {
      setStatusFiles(null)
      setStatusClean(false)
    } finally {
      setStatusLoading(false)
    }
  }, [projectPath])

  const dismissStatus = useCallback(() => {
    setStatusFiles(null)
    setStatusClean(false)
  }, [])

  return (
    <div className="card p-4">
      <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
        Quick Actions
      </h3>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-1.5">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => handleTemplateClick(t)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md
                           hover:bg-turbo-surface-hover
                           transition-colors text-left group"
              >
                <PaletteIcon icon={t.icon} className="w-4 h-4 text-turbo-text-muted group-hover:text-turbo-accent transition-colors" />
                <span className="text-xs font-medium text-turbo-text truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Git presets */}
      {gitPresets.length > 0 && (
        <div>
          {/* Git header with branch switcher */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider">
              Git
            </p>
            {branch && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setBranchDropdownOpen(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded
                             bg-turbo-surface border border-turbo-border text-turbo-text-dim
                             hover:border-turbo-accent/40 hover:text-turbo-text transition-colors max-w-[140px]"
                >
                  <PaletteIcon icon="git-branch" className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{branch}</span>
                  <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`}
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {branchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-turbo-surface border border-turbo-border
                                  rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
                    {localBranches.length === 0 ? (
                      <p className="text-[10px] text-turbo-text-muted px-3 py-2">Loading...</p>
                    ) : (
                      localBranches.map(b => (
                        <button
                          key={b}
                          onClick={() => handleSwitchBranch(b)}
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
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {gitPresets.map(g => (
              <button
                key={g.id}
                onClick={() => handleGitClick(g)}
                disabled={gitLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                           font-medium text-turbo-text-dim
                           bg-turbo-surface border border-turbo-border
                           hover:border-turbo-accent/40 hover:text-turbo-text
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors"
              >
                <PaletteIcon icon={g.icon} className="w-3 h-3" />
                {g.name}
              </button>
            ))}
            <button
              onClick={handleStatus}
              disabled={gitLoading || statusLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                         font-medium text-turbo-text-dim
                         bg-turbo-surface border border-turbo-border
                         hover:border-turbo-accent/40 hover:text-turbo-text
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              <PaletteIcon icon="search" className="w-3 h-3" />
              Status
            </button>
          </div>

          {/* Ephemeral toast for git actions (stage, push, pull, etc.) */}
          <AnimatePresence>
            {(gitLoading || gitSuccess || gitError) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`text-[11px] mt-2 ${
                  gitError ? 'text-red-400' : gitLoading ? 'text-turbo-text-muted' : 'text-emerald-400'
                }`}
              >
                {gitLoading ? gitLoadingMessage || 'Running...' : gitError ?? gitSuccess}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Git status panel */}
          <AnimatePresence>
            {statusLoading && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] text-turbo-text-muted mt-2"
              >
                Checking status...
              </motion.p>
            )}
            {statusClean && !statusLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center justify-between"
              >
                <span className="text-[11px] text-emerald-400">Working tree clean</span>
                <button onClick={dismissStatus} className="text-turbo-text-muted hover:text-turbo-text transition-colors p-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}
            {statusFiles && statusFiles.length > 0 && !statusLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 rounded-md border border-turbo-border bg-turbo-bg overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-turbo-border">
                  <span className="text-[10px] text-turbo-text-muted">
                    {statusFiles.length} changed file{statusFiles.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={dismissStatus} className="text-turbo-text-muted hover:text-turbo-text transition-colors p-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* File list */}
                <div className="max-h-[200px] overflow-y-auto">
                  {statusFiles.slice(0, STATUS_VISIBLE_LIMIT).map((entry, i) => {
                    const { label, color, title } = parseStatusCode(entry.code)
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1 text-[11px] hover:bg-turbo-surface-hover">
                        <span className={`font-mono font-bold w-3 text-center flex-shrink-0 ${color}`} title={title}>{label}</span>
                        <span className="text-turbo-text-dim truncate" title={entry.file}>{entry.file}</span>
                      </div>
                    )
                  })}
                  {statusFiles.length > STATUS_VISIBLE_LIMIT && (
                    <div className="px-2.5 py-1.5 text-[10px] text-turbo-text-muted border-t border-turbo-border">
                      and {statusFiles.length - STATUS_VISIBLE_LIMIT} more file{statusFiles.length - STATUS_VISIBLE_LIMIT !== 1 ? 's' : ''}...
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
