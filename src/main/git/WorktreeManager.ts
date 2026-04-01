import { execFile } from 'child_process'
import { promisify } from 'util'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import type { WorktreeInfo, RebaseResult, PRResult } from '../../shared/types'

const execFileAsync = promisify(execFile)

/**
 * Manages the full lifecycle of git worktrees for parallel task execution.
 */
export class WorktreeManager {

  /**
   * Derive a stable project ID from a project path.
   */
  private projectId(projectPath: string): string {
    return crypto.createHash('md5').update(projectPath).digest('hex').slice(0, 12)
  }

  /**
   * Compute the worktree storage path.
   */
  private worktreeDir(projectPath: string, slug: string): string {
    return path.join(app.getPath('userData'), 'worktrees', this.projectId(projectPath), slug)
  }

  /**
   * Detect the default branch name for the remote (e.g., main, master, develop).
   */
  private async detectDefaultBranch(worktreePath: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        'git', ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'],
        { cwd: worktreePath }
      )
      // Returns e.g. "origin/main" — strip prefix
      return stdout.trim().replace(/^origin\//, '')
    } catch {
      return 'main'
    }
  }

  /**
   * Create a worktree with a new branch `feat/<slug>`.
   */
  async createWorktree(projectPath: string, slug: string): Promise<WorktreeInfo> {
    const wtPath = this.worktreeDir(projectPath, slug)
    const branch = `feat/${slug}`

    await fs.promises.mkdir(path.dirname(wtPath), { recursive: true })

    // If worktree already exists at this path, reuse it
    try {
      await fs.promises.access(wtPath)
      return { path: wtPath, branch, slug, projectPath }
    } catch {
      // Path doesn't exist — create fresh
    }

    try {
      await execFileAsync('git', ['worktree', 'add', wtPath, '-b', branch], { cwd: projectPath })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Branch already exists — create worktree using the existing branch
      if (msg.includes('already exists')) {
        await execFileAsync('git', ['worktree', 'add', wtPath, branch], { cwd: projectPath })
      } else {
        throw err
      }
    }

    return { path: wtPath, branch, slug, projectPath }
  }

  /**
   * List active worktrees for a project.
   */
  async listWorktrees(projectPath: string): Promise<WorktreeInfo[]> {
    const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], { cwd: projectPath })

    const results: WorktreeInfo[] = []
    const projectDir = this.worktreeDir(projectPath, '')
    let currentPath = ''
    let currentBranch = ''

    for (const line of stdout.split('\n')) {
      if (line.startsWith('worktree ')) {
        currentPath = line.slice('worktree '.length)
      } else if (line.startsWith('branch ')) {
        currentBranch = line.slice('branch refs/heads/'.length)
      } else if (line === '') {
        if (currentPath.startsWith(projectDir) && currentBranch.startsWith('feat/')) {
          const slug = currentBranch.replace('feat/', '')
          results.push({ path: currentPath, branch: currentBranch, slug, projectPath })
        }
        currentPath = ''
        currentBranch = ''
      }
    }

    return results
  }

  /**
   * Rebase the worktree branch onto the latest default branch.
   */
  async rebaseOntoMain(worktreePath: string): Promise<RebaseResult> {
    try {
      const [, defaultBranch] = await Promise.all([
        execFileAsync('git', ['fetch', 'origin'], { cwd: worktreePath }),
        this.detectDefaultBranch(worktreePath)
      ])
      await execFileAsync('git', ['rebase', `origin/${defaultBranch}`], { cwd: worktreePath })
      return { success: true, conflicted: false, message: 'Rebase successful' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const conflicted = msg.includes('CONFLICT') || msg.includes('conflict')
      if (conflicted) {
        try { await execFileAsync('git', ['rebase', '--abort'], { cwd: worktreePath }) } catch {}
      }
      return { success: false, conflicted, message: msg }
    }
  }

  /**
   * Push branch and create PR via `gh pr create`.
   */
  async createPR(worktreePath: string, title: string, body: string): Promise<PRResult> {
    try {
      const { stdout: branchRaw } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath })
      const branch = branchRaw.trim()

      await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd: worktreePath })

      const { stdout: prUrl } = await execFileAsync('gh', ['pr', 'create', '--title', title, '--body', body], {
        cwd: worktreePath,
        timeout: 30000
      })

      return { success: true, url: prUrl.trim(), message: 'PR created' }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Remove worktree and optionally delete the branch.
   */
  async removeWorktree(worktreePath: string, deleteBranch = false): Promise<void> {
    // Gather info in parallel before destructive operations
    const [branchResult, repoPathResult] = await Promise.all([
      deleteBranch
        ? execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath }).catch(() => null)
        : Promise.resolve(null),
      execFileAsync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: worktreePath }).catch(() => null)
    ])

    const branch = branchResult?.stdout.trim() ?? ''
    const mainRepoPath = repoPathResult ? path.dirname(repoPathResult.stdout.trim()) : ''

    await execFileAsync('git', ['worktree', 'remove', worktreePath, '--force'], { cwd: mainRepoPath || worktreePath })

    if (deleteBranch && branch && mainRepoPath) {
      try {
        await execFileAsync('git', ['branch', '-d', branch], { cwd: mainRepoPath })
      } catch {}
    }
  }
}
