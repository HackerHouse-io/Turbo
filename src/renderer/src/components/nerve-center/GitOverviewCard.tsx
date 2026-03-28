import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { GitBranchInfo } from '../../../../shared/types'

interface GitOverviewCardProps {
  git: GitBranchInfo | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function GitOverviewCard({ git, loading, error, onRefresh }: GitOverviewCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider">
          Git
        </h3>
        <button
          onClick={onRefresh}
          className="text-turbo-text-muted hover:text-turbo-text transition-colors"
          title="Refresh"
        >
          <PaletteIcon icon="refresh" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <p className="text-xs text-turbo-text-muted">{error}</p>
      ) : loading && !git ? (
        <div className="h-8 rounded bg-turbo-surface-active animate-pulse" />
      ) : git ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <PaletteIcon icon="git-branch" className="w-3.5 h-3.5 text-turbo-text-muted" />
            <span className="text-sm font-medium text-turbo-text truncate">
              {git.branch}
            </span>
          </div>
          {git.dirty === 0 && git.staged === 0 ? (
            <p className="text-xs text-turbo-text-muted">Working tree clean</p>
          ) : (
            <div className="flex items-center gap-3">
              {git.dirty > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-turbo-text-dim">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {git.dirty} dirty
                </span>
              )}
              {git.staged > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-turbo-text-dim">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {git.staged} staged
                </span>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
