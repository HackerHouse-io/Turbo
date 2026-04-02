import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaybookExecution, PlaybookStepStatus } from '../../../../shared/types'
import { isTerminalStatus } from '../../../../shared/types'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'
import { PaletteIcon } from '../command-palette/PaletteIcon'

interface PlaybookProgressBannerProps {
  executions: PlaybookExecution[]
}

export function PlaybookProgressBanner({ executions }: PlaybookProgressBannerProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {executions.map(exec => (
          <motion.div
            key={exec.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PlaybookBannerCard execution={exec} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function PlaybookBannerCard({ execution }: { execution: PlaybookExecution }) {
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)
  const removeExecution = usePlaybookStore(s => s.removeExecution)

  const [commitMessage, setCommitMessage] = useState<string | null>(null)
  const [committed, setCommitted] = useState(false)
  const [pushed, setPushed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [prCreated, setPrCreated] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [merged, setMerged] = useState(false)
  const [rebaseError, setRebaseError] = useState<string | null>(null)

  const isWorktree = !!execution.worktreePath

  const completedCount = execution.steps.filter(s => s.status === 'completed').length
  const totalSteps = execution.steps.length
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  // Generate commit message when reaching awaiting_commit (once per execution)
  const commitFetchedRef = useRef(false)
  useEffect(() => {
    if (execution.status !== 'awaiting_commit' || commitFetchedRef.current) return
    commitFetchedRef.current = true
    let cancelled = false
    window.api.gitAIMessage(execution.projectPath).then(result => {
      if (!cancelled && result?.message) setCommitMessage(result.message)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [execution.status, execution.projectPath])

  const handleCommit = useCallback(async () => {
    if (!commitMessage) return
    setLoading(true)
    try {
      const result = await window.api.gitCommit({ projectPath: execution.projectPath, message: commitMessage })
      if (result.success) setCommitted(true)
    } finally {
      setLoading(false)
    }
  }, [commitMessage, execution.projectPath])

  const handlePush = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.gitPush(execution.projectPath)
      if (result.success) setPushed(true)
    } finally {
      setLoading(false)
    }
  }, [execution.projectPath])

  // Shared helper: commit changes and rebase onto main. Returns false if either step fails.
  const commitAndRebase = useCallback(async (): Promise<boolean> => {
    if (!execution.worktreePath || !commitMessage) return false
    setRebaseError(null)

    const commitResult = await window.api.gitCommit({ projectPath: execution.projectPath, message: commitMessage })
    if (!commitResult.success) return false
    setCommitted(true)

    const rebaseResult = await window.api.rebaseWorktree(execution.worktreePath)
    if (!rebaseResult.success) {
      setRebaseError(rebaseResult.message)
      return false
    }
    return true
  }, [execution.worktreePath, execution.projectPath, commitMessage])

  // Worktree: Create PR (commit + rebase + push + gh pr create)
  const handleCreatePR = useCallback(async () => {
    if (!execution.worktreePath) return
    setLoading(true)
    try {
      if (!await commitAndRebase()) return

      const prResult = await window.api.createWorktreePR(
        execution.worktreePath,
        commitMessage!.split('\n')[0],
        `## Summary\n\nAutomated PR from Turbo playbook.\n\n${commitMessage}`
      )
      if (prResult.success) {
        setPrCreated(true)
        setPrUrl(prResult.url ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [execution.worktreePath, commitMessage, commitAndRebase])

  // Worktree: Merge locally (commit + rebase + merge into source)
  const handleMergeLocal = useCallback(async () => {
    if (!execution.worktreePath) return
    setLoading(true)
    try {
      if (!await commitAndRebase()) return

      if (execution.worktreeSourceProject) {
        const branchResult = await window.api.gitExec({
          projectPath: execution.worktreePath,
          commands: ['git rev-parse --abbrev-ref HEAD']
        })
        if (branchResult.success) {
          const branch = branchResult.steps[0]?.stdout?.trim()
          if (branch) {
            await window.api.gitExec({
              projectPath: execution.worktreeSourceProject,
              commands: [`git merge ${branch}`]
            })
          }
        }
      }

      setMerged(true)
    } finally {
      setLoading(false)
    }
  }, [execution.worktreePath, execution.worktreeSourceProject, commitAndRebase])

  // Worktree: Keep branch (commit to preserve work, then dismiss)
  const handleKeepBranch = useCallback(async () => {
    if (commitMessage && !committed) {
      await window.api.gitCommit({ projectPath: execution.projectPath, message: commitMessage })
    }
    await window.api.dismissPlaybook(execution.id)
  }, [execution.id, execution.projectPath, commitMessage, committed])

  const handleDismiss = useCallback(async () => {
    await window.api.dismissPlaybook(execution.id)
  }, [execution.id])

  const handleRemove = useCallback(async () => {
    await window.api.removePlaybookExecution(execution.id)
    removeExecution(execution.id)
  }, [execution.id, removeExecution])

  const handlePause = useCallback(() => {
    window.api.pausePlaybook(execution.id)
  }, [execution.id])

  const handleResume = useCallback(() => {
    window.api.resumePlaybook(execution.id)
  }, [execution.id])

  const handleStop = useCallback(() => {
    window.api.stopPlaybook(execution.id)
  }, [execution.id])

  const handleAdvanceStep = useCallback(() => {
    window.api.advancePlaybookStep(execution.id)
  }, [execution.id])

  const handleStepClick = useCallback((sessionId?: string) => {
    if (!sessionId) return
    selectSession(sessionId)
    setViewMode('detail')
  }, [selectSession, setViewMode])

  const isTerminal = isTerminalStatus(execution.status)

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-turbo-border">
        <PaletteIcon icon="playbook" className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text flex-1">{execution.playbookName}</span>
        {!isTerminal && (
          <span className="text-xs text-turbo-text-muted">
            step {execution.currentStepIndex + 1} of {totalSteps}
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 ml-2">
          {execution.status === 'running' && (
            <button onClick={handlePause} className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-text-muted" title="Pause">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            </button>
          )}
          {execution.status === 'paused' && (
            <button onClick={handleResume} className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-accent" title="Resume">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </button>
          )}
          {(execution.status === 'running' || execution.status === 'paused') && (
            <button onClick={handleStop} className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-text-muted" title="Stop">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            </button>
          )}
          {isTerminal && (
            <button onClick={handleRemove} className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-text-muted" title="Dismiss">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="px-4 py-2.5 space-y-1">
        {execution.steps.map((step) => (
          <button
            key={step.index}
            onClick={() => handleStepClick(step.sessionId)}
            disabled={!step.sessionId}
            className="w-full flex items-center gap-2 text-sm py-0.5 text-left hover:opacity-80 disabled:hover:opacity-100 disabled:cursor-default"
          >
            <StepStatusIcon status={step.status} />
            <span className={step.status === 'running' ? 'text-turbo-text' : 'text-turbo-text-dim'}>
              {step.name}
            </span>
            <span className="text-[10px] text-turbo-text-muted ml-auto">
              {step.status === 'running' ? 'running' :
               step.status === 'completed' ? 'done' :
               step.status === 'failed' ? step.error || 'failed' :
               step.status === 'skipped' ? 'skipped' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Next Step button — shown when current step is done and waiting for user */}
      {execution.currentStepWaiting && execution.status === 'running' && (
        <div className="px-4 pb-2">
          <button
            onClick={handleAdvanceStep}
            className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors"
          >
            Next Step
          </button>
        </div>
      )}

      {/* Progress bar */}
      {!isTerminal && execution.status !== 'awaiting_commit' && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-turbo-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-turbo-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-turbo-text-muted w-8 text-right">{progress}%</span>
          </div>
          {execution.status === 'paused' && (
            <span className="text-[10px] text-turbo-warning mt-1 block">Paused</span>
          )}
        </div>
      )}

      {/* Awaiting commit state */}
      {execution.status === 'awaiting_commit' && (
        <div className="px-4 pb-3 pt-1 border-t border-turbo-border">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-turbo-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-turbo-success">
              {isWorktree ? 'Ready to merge' : 'Ready to commit'}
            </span>
          </div>

          <div className="space-y-2">
            {!committed && !prCreated && !merged && commitMessage && (
              <div className="text-xs text-turbo-text-dim bg-turbo-bg rounded px-2 py-1.5 border border-turbo-border">
                {commitMessage}
              </div>
            )}

            {rebaseError && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5 border border-red-500/20">
                Rebase conflict: {rebaseError.slice(0, 200)}
              </div>
            )}

            {isWorktree ? (
              /* Worktree-aware merge prompt */
              <div className="flex items-center gap-2">
                {prCreated || merged ? (
                  <>
                    <span className="text-xs text-turbo-success">
                      {prCreated ? 'PR created' : 'Merged to main'}
                      {prUrl && <>{': '}<span className="font-mono text-turbo-accent">{prUrl}</span></>}
                    </span>
                    <button
                      onClick={handleDismiss}
                      className="h-7 text-[11px] px-3 rounded-md bg-turbo-surface border border-turbo-border
                                 text-turbo-text-dim hover:bg-turbo-surface-hover transition-colors"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCreatePR}
                      disabled={!commitMessage || loading}
                      className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                                 hover:bg-turbo-accent/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Creating PR...' : 'Create PR'}
                    </button>
                    <button
                      onClick={handleMergeLocal}
                      disabled={!commitMessage || loading}
                      className="h-7 text-[11px] px-3 rounded-md bg-turbo-surface border border-turbo-border
                                 text-turbo-text-dim hover:bg-turbo-surface-hover transition-colors disabled:opacity-50"
                    >
                      Merge to main
                    </button>
                    <button
                      onClick={handleKeepBranch}
                      className="h-7 text-[11px] px-3 rounded-md bg-turbo-surface border border-turbo-border
                                 text-turbo-text-dim hover:bg-turbo-surface-hover transition-colors"
                    >
                      Keep branch
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Standard (non-worktree) commit prompt */
              <div className="flex items-center gap-2">
                {!committed ? (
                  <button
                    onClick={handleCommit}
                    disabled={!commitMessage || loading}
                    className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                               hover:bg-turbo-accent/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Committing...' : 'Commit'}
                  </button>
                ) : !pushed ? (
                  <>
                    <span className="text-xs text-turbo-success">Committed</span>
                    <button
                      onClick={handlePush}
                      disabled={loading}
                      className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                                 hover:bg-turbo-accent/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Pushing...' : 'Push'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-turbo-success">Pushed to remote</span>
                )}
                <button
                  onClick={handleDismiss}
                  className="h-7 text-[11px] px-3 rounded-md bg-turbo-surface border border-turbo-border
                             text-turbo-text-dim hover:bg-turbo-surface-hover transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step Status Icon ──────────────────────────────────────────

function StepStatusIcon({ status }: { status: PlaybookStepStatus }) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-4 h-4 rounded-full border border-turbo-border flex-shrink-0" />
      )
    case 'running':
      return (
        <div className="w-4 h-4 rounded-full bg-turbo-accent/20 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-turbo-accent animate-pulse" />
        </div>
      )
    case 'completed':
      return (
        <svg className="w-4 h-4 text-turbo-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )
    case 'failed':
      return (
        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case 'skipped':
      return (
        <svg className="w-4 h-4 text-turbo-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
        </svg>
      )
  }
}
