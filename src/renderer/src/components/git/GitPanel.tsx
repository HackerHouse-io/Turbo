import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { useNerveCenterData } from '../../hooks/useNerveCenterData'
import { useGitActionsStore } from '../../stores/useGitActionsStore'
import { BranchSwitcher } from '../command-center/BranchSwitcher'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { runInTerminalDrawer } from '../../lib/runInTerminalDrawer'
import { Spinner } from '../common/Spinner'

// ─── Action Button ──────────────────────────────────────────────

function ActionButton({ label, shortcut, icon, color, loading, disabled, tooltip, onClick }: {
  label: string
  shortcut: string
  icon: React.ReactNode
  color: string
  loading: boolean
  disabled?: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <div className="relative group/action w-full">
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium
                    transition-all active:scale-[0.98]
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${color}`}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {loading ? <Spinner className="w-3.5 h-3.5" /> : icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        <kbd className="text-[9px] opacity-70 font-mono">{shortcut}</kbd>
      </button>
      {tooltip && disabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-md
                        bg-turbo-surface border border-turbo-border/40 text-[10px] text-turbo-muted
                        whitespace-nowrap opacity-0 group-hover/action:opacity-100 transition-opacity
                        pointer-events-none z-50 shadow-lg">
          {tooltip}
        </div>
      )}
    </div>
  )
}

// ─── Ship It Confirmation Modal ─────────────────────────────────

function ShipItModal({ identity, onConfirm, onCancel }: {
  identity: string
  onConfirm: (dontShowAgain: boolean) => void
  onCancel: () => void
}) {
  const [dontShow, setDontShow] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm mx-4 bg-turbo-surface border border-turbo-border
                   rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-turbo-accent/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-turbo-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-turbo-text">Ship It</h3>
              <p className="text-[11px] text-turbo-text-muted">Full commit pipeline in one click</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            <p className="text-xs text-turbo-text-dim leading-relaxed">
              This will run the full pipeline:
            </p>
            <div className="space-y-1.5 pl-1">
              <Step num={1} text="Stage & commit with AI message" accent />
              <Step num={2} text="Push to current branch" accent={false} />
              <Step num={3} text="Merge latest main into branch" accent={false} />
              <Step num={4} text="Resolve conflicts (if any)" accent={false} />
              <Step num={5} text="Create PR with AI description" accent />
            </div>
            {identity && (
              <p className="text-[11px] text-turbo-text-muted mt-3">
                Commits will be attributed to <span className="text-turbo-text font-medium">{identity}</span>
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-turbo-border bg-turbo-bg accent-turbo-accent cursor-pointer"
            />
            <span className="text-[11px] text-turbo-text-muted">Don't show this again</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onConfirm(dontShow)}
              className="flex-1 h-9 rounded-lg text-xs font-semibold bg-turbo-accent text-white
                         hover:bg-turbo-accent/90 active:scale-[0.98] transition-all"
            >
              Ship It
            </button>
            <button
              onClick={onCancel}
              className="flex-1 h-9 rounded-lg text-xs font-medium bg-turbo-surface border border-turbo-border
                         text-turbo-text-dim hover:bg-turbo-surface-active transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Step({ num, text, accent }: { num: number; text: string; accent: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
        ${accent ? 'bg-turbo-accent/20 text-turbo-accent' : 'bg-turbo-border/30 text-turbo-text-muted'}`}>
        {num}
      </span>
      <span className={`text-xs ${accent ? 'text-turbo-text' : 'text-turbo-text-dim'}`}>{text}</span>
    </div>
  )
}

// ─── Git Panel ──────────────────────────────────────────────────

export function GitPanel() {
  const projectPath = useProjectStore(selectProjectPath)
  const { git, commits, changedFiles, refresh, forceRefresh } = useNerveCenterData(projectPath)
  const [spinning, setSpinning] = useState(false)
  const spinTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleRefresh = useCallback(() => {
    refresh()
    setSpinning(true)
    clearTimeout(spinTimer.current)
    spinTimer.current = setTimeout(() => setSpinning(false), 600)
  }, [refresh])
  const quickCommit = useGitActionsStore(s => s.quickCommit)
  const push = useGitActionsStore(s => s.push)
  const pull = useGitActionsStore(s => s.pull)
  const shipIt = useGitActionsStore(s => s.shipIt)
  const loading = useGitActionsStore(s => s.loading)
  const lastMessage = useGitActionsStore(s => s.lastMessage)
  const lastError = useGitActionsStore(s => s.lastError)
  const lastPRUrl = useGitActionsStore(s => s.lastPRUrl)
  const shipProgress = useGitActionsStore(s => s.shipProgress)
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [shipItModalOpen, setShipItModalOpen] = useState(false)
  const currentResolved = useGitIdentityStore(s => s.currentResolved)

  const identityLabel = currentResolved?.identity
    ? `${currentResolved.identity.name} <${currentResolved.identity.email}>`
    : ''

  const setError = useGitActionsStore(s => s.setError)
  const isOnMain = git?.branch === 'main' || git?.branch === 'master'

  const handleShipIt = useCallback(() => {
    if (isOnMain) {
      setError('Cannot ship from main. Create a feature branch first.')
      return
    }
    try {
      if (localStorage.getItem('turbo:shipItDontShow') === 'true') {
        shipIt()
        return
      }
    } catch { /* */ }
    setShipItModalOpen(true)
  }, [shipIt, isOnMain])

  const handleShipItConfirm = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) {
      try { localStorage.setItem('turbo:shipItDontShow', 'true') } catch { /* */ }
    }
    setShipItModalOpen(false)
    shipIt()
  }, [shipIt])

  const toggleFiles = useCallback(() => {
    setFilesExpanded(v => !v)
  }, [])

  const handleShowCommit = useCallback((hash: string) => {
    if (!projectPath) return
    runInTerminalDrawer(projectPath, `git show ${hash}`)
  }, [projectPath])

  const handleShowFileDiff = useCallback((file: string, status: string) => {
    if (!projectPath) return
    const safe = file.replace(/'/g, "'\\''")
    const cmd = status === '?' ? `cat '${safe}'` : `git diff -- '${safe}'`
    runInTerminalDrawer(projectPath, cmd)
  }, [projectPath])

  const handleShowStatus = useCallback(() => {
    if (!projectPath) return
    runInTerminalDrawer(projectPath, 'git status')
  }, [projectPath])

  const anyLoading = loading.commit || loading.push || loading.pull || loading.ship
  const hasChanges = git && (git.dirty > 0 || git.staged > 0)

  return (
    <div className="w-56 flex-shrink-0 border-l border-turbo-border/30 bg-turbo-bg flex flex-col">
      {/* Branch & status */}
      <div className="px-3 pt-3 pb-2 border-b border-turbo-border/20">
        {git ? (
          <>
            <div className="flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <BranchSwitcher
                  projectPath={projectPath!}
                  branch={git.branch}
                  onRefresh={forceRefresh}
                />
              </div>
              <button
                onClick={handleRefresh}
                className="p-1 rounded-md text-turbo-text-muted hover:text-turbo-text
                           hover:bg-turbo-surface-active transition-colors flex-shrink-0"
                title="Refresh git status"
              >
                <PaletteIcon icon="refresh" className={`w-3.5 h-3.5 transition-transform ${spinning ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={handleShowStatus}
              className="flex items-center gap-3 mt-2 text-[11px] cursor-pointer
                         hover:opacity-80 transition-opacity w-full"
            >
              {git.dirty > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {git.dirty} changed
                </span>
              )}
              {git.staged > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {git.staged} staged
                </span>
              )}
              {git.dirty === 0 && git.staged === 0 && (
                <span className="text-turbo-text-muted">Clean</span>
              )}
            </button>
          </>
        ) : (
          <p className="text-xs text-turbo-text-muted">Not a git repo</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-2 py-3 space-y-1 border-b border-turbo-border/20">
        <ActionButton
          label="Commit"
          shortcut="&#8679;&#8984;C"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="4" />
              <line x1="1.05" y1="12" x2="7" y2="12" />
              <line x1="17.01" y1="12" x2="22.96" y2="12" />
            </svg>
          }
          color="bg-turbo-surface hover:bg-emerald-500/15 text-turbo-text hover:text-emerald-400 border border-turbo-border/30 hover:border-emerald-500/30"
          loading={loading.commit}
          disabled={anyLoading || !hasChanges}
          onClick={quickCommit}
        />
        <ActionButton
          label="Push"
          shortcut="&#8679;&#8984;P"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
            </svg>
          }
          color="bg-turbo-surface hover:bg-blue-500/15 text-turbo-text hover:text-blue-400 border border-turbo-border/30 hover:border-blue-500/30"
          loading={loading.push}
          disabled={anyLoading}
          onClick={push}
        />
        <ActionButton
          label="Pull"
          shortcut="&#8679;&#8984;L"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7l-7 7-7-7" />
            </svg>
          }
          color="bg-turbo-surface hover:bg-cyan-500/15 text-turbo-text hover:text-cyan-400 border border-turbo-border/30 hover:border-cyan-500/30"
          loading={loading.pull}
          disabled={anyLoading}
          onClick={pull}
        />
        <ActionButton
          label="Ship It"
          shortcut="&#8679;&#8984;S"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          }
          color="mt-1 bg-turbo-accent/10 hover:bg-turbo-accent/20 text-turbo-accent border border-turbo-accent/20 hover:border-turbo-accent/40"
          loading={loading.ship}
          disabled={anyLoading || !hasChanges || isOnMain}
          tooltip={isOnMain ? 'Create a feature branch to ship changes' : undefined}
          onClick={handleShipIt}
        />
        {shipProgress && (
          <p className="text-[10px] text-turbo-accent mt-1.5 px-3 animate-pulse truncate">
            {shipProgress}
          </p>
        )}
      </div>

      {/* View PR button */}
      {lastPRUrl && (
        <div className="px-2 py-2 border-b border-turbo-border/20">
          <button
            onClick={() => window.api.openExternal(lastPRUrl)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium
                       bg-turbo-accent/10 hover:bg-turbo-accent/20 text-turbo-accent
                       border border-turbo-accent/20 hover:border-turbo-accent/40
                       transition-all active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6h6m0 0v6m0-6L10.5 13.5" />
            </svg>
            <span className="flex-1 text-left">View PR</span>
            <svg className="w-3 h-3 opacity-50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </button>
        </div>
      )}

      {/* Status message */}
      <AnimatePresence mode="wait">
        {(lastMessage || lastError) && (
          <motion.div
            key={lastError ? 'error' : lastMessage}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={`px-3 py-2 text-[11px] border-b border-turbo-border/20 ${
              lastError ? 'text-red-400 bg-red-500/5' : 'text-emerald-400 bg-emerald-500/5'
            }`}>
              {lastError || lastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Changed files (expandable) */}
      <div className="flex-1 overflow-y-auto">
        {hasChanges && (
          <div className="px-3 pt-3 pb-2">
            <button
              onClick={toggleFiles}
              className="flex items-center gap-1 text-[10px] font-semibold text-turbo-text-muted uppercase tracking-wider
                         hover:text-turbo-text-dim transition-colors w-full"
            >
              <svg className={`w-3 h-3 transition-transform ${filesExpanded ? 'rotate-90' : ''}`}
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Changed Files
            </button>
            <AnimatePresence>
              {filesExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 space-y-0.5">
                    {changedFiles.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => handleShowFileDiff(f.file, f.status)}
                        className="flex items-center gap-2 text-[11px] py-0.5 w-full text-left rounded
                                   hover:bg-turbo-surface-active cursor-pointer transition-colors px-1"
                      >
                        <span className={`font-mono text-[10px] w-4 text-center flex-shrink-0 ${
                          f.status === 'M' ? 'text-amber-400'
                          : f.status === 'A' || f.status === '?' ? 'text-emerald-400'
                          : f.status === 'D' ? 'text-red-400'
                          : 'text-turbo-text-muted'
                        }`}>
                          {f.status === '?' ? 'N' : f.status}
                        </span>
                        <span className="text-turbo-text-dim truncate">{f.file}</span>
                      </button>
                    ))}
                    {changedFiles.length === 0 && (
                      <p className="text-[10px] text-turbo-text-muted py-1">No changes</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Recent commits */}
        {commits.length > 0 && (
          <div className="px-3 pt-3 pb-2">
            <h3 className="text-[10px] font-semibold text-turbo-text-muted uppercase tracking-wider mb-2">
              Recent Commits
            </h3>
            <div className="space-y-1">
              {commits.map(c => (
                <button
                  key={c.hash}
                  onClick={() => handleShowCommit(c.hash)}
                  className="flex items-start gap-2 w-full text-left rounded px-1 py-0.5
                             hover:bg-turbo-surface-active cursor-pointer transition-colors"
                >
                  <code className="text-[10px] text-turbo-accent font-mono flex-shrink-0 mt-px">{c.hash}</code>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-turbo-text-dim truncate">{c.message}</p>
                    <p className="text-[10px] text-turbo-text-muted">{c.relativeTime}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {shipItModalOpen && (
          <ShipItModal
            identity={identityLabel}
            onConfirm={handleShipItConfirm}
            onCancel={() => setShipItModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
