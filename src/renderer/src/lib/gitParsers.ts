/**
 * Parse `git status --porcelain` output into dirty/staged counts.
 * Shared between useNerveCenterData and useOverviewData.
 */
export function parsePorcelainStatus(raw: string): { dirty: number; staged: number } {
  let dirty = 0
  let staged = 0
  for (const line of raw.split('\n')) {
    if (line.length < 2) continue
    const index = line[0]
    const worktree = line[1]
    // Staged: index column has a letter (not space or ?)
    if (index !== ' ' && index !== '?') staged++
    // Dirty: worktree column has a letter, or untracked (??)
    if (worktree !== ' ' && worktree !== '?') dirty++
    if (line.startsWith('??')) dirty++
  }
  return { dirty, staged }
}
