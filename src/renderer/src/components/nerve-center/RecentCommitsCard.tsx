import type { GitCommitEntry } from '../../../../shared/types'

interface RecentCommitsCardProps {
  commits: GitCommitEntry[]
  loading: boolean
}

export function RecentCommitsCard({ commits, loading }: RecentCommitsCardProps) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
        Recent Commits
      </h3>

      {loading && commits.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-5 rounded bg-turbo-surface-active animate-pulse" />
          ))}
        </div>
      ) : commits.length === 0 ? (
        <p className="text-xs text-turbo-text-muted">No commits yet</p>
      ) : (
        <div className="divide-y divide-turbo-border">
          {commits.map(c => (
            <div key={c.hash} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <code className="text-[11px] text-turbo-text-muted font-mono shrink-0">
                {c.hash}
              </code>
              <span className="text-xs text-turbo-text truncate flex-1">
                {c.message}
              </span>
              <span className="text-[11px] text-turbo-text-muted shrink-0">
                {c.relativeTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
