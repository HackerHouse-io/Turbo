export interface GitFileEntry {
  status: string
  file: string
}

/**
 * Parse `git status --porcelain` output into dirty/staged counts and file list.
 * Shared between useNerveCenterData and useOverviewData.
 */
export function parsePorcelainStatus(raw: string): {
  dirty: number
  staged: number
  files: GitFileEntry[]
} {
  let dirty = 0
  let staged = 0
  const files: GitFileEntry[] = []

  for (const line of raw.split('\n')) {
    if (line.length < 2) continue
    const index = line[0]
    const worktree = line[1]
    // Staged: index column has a letter (not space or ?)
    if (index !== ' ' && index !== '?') staged++
    // Dirty: worktree column has a letter, or untracked (??)
    if (worktree !== ' ' && worktree !== '?') dirty++
    if (line.startsWith('??')) dirty++

    const status = line.slice(0, 2).trim()
    const file = line.slice(3).trim()
    if (status && file) {
      files.push({ status, file })
    }
  }

  return { dirty, staged, files }
}
