import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useNerveCenterData } from '../../hooks/useNerveCenterData'

interface GitStatusBarProps {
  projectPath: string | undefined
}

export function GitStatusBar({ projectPath }: GitStatusBarProps) {
  const { git, loading, refresh } = useNerveCenterData(projectPath)

  if (!git && !loading) return null

  return (
    <div className="flex items-center gap-3 px-1 py-2 text-xs text-turbo-text-muted">
      {loading && !git ? (
        <div className="h-4 w-32 rounded bg-turbo-surface-active animate-pulse" />
      ) : git ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <PaletteIcon icon="git-branch" className="w-3 h-3" />
            <span className="font-medium text-turbo-text-dim">{git.branch}</span>
          </span>
          {git.dirty > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {git.dirty}
            </span>
          )}
          {git.staged > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {git.staged}
            </span>
          )}
          {git.dirty === 0 && git.staged === 0 && (
            <span className="text-turbo-text-muted">clean</span>
          )}
          <button
            onClick={refresh}
            className="ml-auto text-turbo-text-muted hover:text-turbo-text transition-colors"
            title="Refresh git status"
          >
            <PaletteIcon icon="refresh" className="w-3 h-3" />
          </button>
        </>
      ) : null}
    </div>
  )
}
