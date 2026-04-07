import { useUpdateStore } from '../../stores/useUpdateStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { CLAUDE_UPDATE_COMMAND } from '../../../../shared/constants'
import { runInTerminalDrawer } from '../../lib/runInTerminalDrawer'
import { Modal } from '../common/Modal'

export function UpdateAvailableModal() {
  const currentVersion = useUpdateStore(s => s.currentVersion)
  const latestVersion = useUpdateStore(s => s.latestVersion)
  const dismiss = useUpdateStore(s => s.dismiss)
  const acceptUpdate = useUpdateStore(s => s.acceptUpdate)
  const projectPath = useProjectStore(selectProjectPath)
  const canUpdate = !!projectPath

  const handleUpdate = () => {
    acceptUpdate()
    void runInTerminalDrawer(projectPath!, CLAUDE_UPDATE_COMMAND)
    // Bust the install/update caches so the next check picks up the new
    // local version after `claude update` finishes.
    void window.api.recheckClaudeInstalled().catch(() => { /* noop */ })
  }

  return (
    <Modal onDismiss={dismiss} zClass="z-[55]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-turbo-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-turbo-accent/10 ring-1 ring-turbo-accent/20 flex items-center justify-center text-turbo-accent">
            <DownloadIcon />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-turbo-text leading-tight">
              Claude CLI update available
            </h2>
            {currentVersion && latestVersion && (
              <p className="text-[11px] font-mono text-turbo-text-muted mt-0.5 truncate">
                <span>v{currentVersion}</span>
                <span className="px-1">→</span>
                <span className="text-turbo-accent">v{latestVersion}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-turbo-surface-hover text-turbo-text-muted hover:text-turbo-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-turbo-text-dim leading-relaxed mb-3">
          A newer version of Claude Code is ready to install. Updating is optional —
          you can keep working on your current version and update later.
        </p>

        <div className="flex items-center gap-2 bg-turbo-bg border border-turbo-border rounded-lg p-2">
          <span className="text-turbo-success font-mono text-xs select-none">$</span>
          <code className="flex-1 text-xs font-mono text-turbo-text truncate">
            {CLAUDE_UPDATE_COMMAND}
          </code>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-turbo-border bg-turbo-surface/50">
        <button
          onClick={dismiss}
          className="h-8 px-3 rounded-lg text-xs font-medium border border-turbo-border
                     text-turbo-text-dim hover:text-turbo-text hover:bg-turbo-surface-hover
                     transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={handleUpdate}
          disabled={!canUpdate}
          title={canUpdate ? undefined : 'Add a project first to run the updater'}
          className="h-8 px-4 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                     text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-1.5"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Update Now
        </button>
      </div>
    </Modal>
  )
}

function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
