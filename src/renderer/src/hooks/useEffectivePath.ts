import { useProjectStore, selectProjectPath } from '../stores/useProjectStore'
import { useWorktreeStore } from '../stores/useWorktreeStore'

/**
 * Returns the effective project path — the active worktree path if one is set,
 * otherwise the project root path. This is the single choke point for all
 * git operations that need to respect worktree isolation.
 */
export function useEffectivePath(): string | undefined {
  const projectPath = useProjectStore(selectProjectPath)
  const activeWorktreePath = useWorktreeStore(
    s => projectPath ? s.activeWorktreePath[projectPath] ?? null : null
  )
  return activeWorktreePath ?? projectPath
}
