import { execFile } from 'child_process'
import { GitIdentityManager } from './GitIdentityManager'
import type {
  GitCommandResult,
  GitWorkflowResult,
  GitAIMessageResult,
  GitIdentity,
  PRResult
} from '../../shared/types'

const GIT_TIMEOUT = 30_000
const AI_TIMEOUT = 60_000

/**
 * GitOpsManager: Executes git commands with identity env injection.
 * Uses child_process.execFile (not PTY) for all operations.
 */
export class GitOpsManager {
  private gitIdentity: GitIdentityManager

  constructor(gitIdentity: GitIdentityManager) {
    this.gitIdentity = gitIdentity
  }

  async exec(
    projectPath: string,
    command: string,
    args: string[],
    identity?: GitIdentity | null,
    timeout = GIT_TIMEOUT
  ): Promise<GitCommandResult> {
    const env: Record<string, string> = { ...process.env as Record<string, string> }
    if (identity) {
      Object.assign(env, this.gitIdentity.buildGitEnv(identity))
    }

    return new Promise(resolve => {
      execFile(command, args, { cwd: projectPath, env, timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        const exitCode = err && 'code' in err ? (err as any).code as number : (err ? 1 : 0)
        resolve({
          success: !err,
          command: `${command} ${args.join(' ')}`,
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: typeof exitCode === 'number' ? exitCode : 1
        })
      })
    })
  }

  private async gitExec(
    projectPath: string,
    args: string[],
    identity?: GitIdentity | null
  ): Promise<GitCommandResult> {
    return this.exec(projectPath, 'git', args, identity)
  }

  async stageAll(projectPath: string, identity?: GitIdentity | null): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['add', '-A'], identity)
  }

  async commit(projectPath: string, message: string, identity?: GitIdentity | null): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['commit', '-m', message], identity)
  }

  async push(projectPath: string, identity?: GitIdentity | null): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['push'], identity)
  }

  async pullRebase(projectPath: string, identity?: GitIdentity | null): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['pull', '--rebase'], identity)
  }

  async getStatus(projectPath: string): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['status', '--porcelain'])
  }

  async getDiffStat(projectPath: string): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['diff', '--staged', '--stat'])
  }

  async generateAICommitMessage(
    projectPath: string,
    identity?: GitIdentity | null
  ): Promise<GitAIMessageResult> {
    // Check if there are staged changes
    let stat = await this.getDiffStat(projectPath)
    if (!stat.stdout.trim()) {
      // Auto-stage all if nothing staged
      await this.stageAll(projectPath, identity)
      stat = await this.getDiffStat(projectPath)
    }

    if (!stat.stdout.trim()) {
      return { message: '', diffStat: 'No changes to commit' }
    }

    // Get the diff (truncated)
    const diffResult = await this.gitExec(projectPath, ['diff', '--staged'])
    const diff = diffResult.stdout.slice(0, 8000)

    const prompt = `Generate a concise conventional commit message. Output ONLY the message, no quotes, no explanation.\n\nDiff stat:\n${stat.stdout}\n\nDiff:\n${diff}`

    const result = await this.exec(
      projectPath,
      'claude',
      ['-p', prompt],
      null,
      AI_TIMEOUT
    )

    const message = result.stdout
      .trim()
      .replace(/^["']|["']$/g, '') // strip wrapping quotes
      .trim()

    return { message, diffStat: stat.stdout.trim() }
  }

  // ─── Ship It Pipeline Methods ─────────────────────────────

  async getCurrentBranch(projectPath: string): Promise<string> {
    const result = await this.gitExec(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!result.success) throw new Error('Not on a branch')
    return result.stdout.trim()
  }

  async detectDefaultBranch(projectPath: string): Promise<string> {
    const result = await this.gitExec(projectPath, ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'])
    if (result.success) return result.stdout.trim().replace(/^origin\//, '')
    return 'main'
  }

  async pushWithUpstream(
    projectPath: string,
    branch: string,
    identity?: GitIdentity | null
  ): Promise<GitCommandResult> {
    return this.exec(projectPath, 'git', ['push', '-u', 'origin', branch], identity)
  }

  async fetchOrigin(projectPath: string): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['fetch', 'origin'])
  }

  async mergeMain(
    projectPath: string,
    defaultBranch: string,
    identity?: GitIdentity | null
  ): Promise<GitCommandResult> {
    return this.exec(projectPath, 'git', ['merge', `origin/${defaultBranch}`, '--no-edit'], identity)
  }

  async getConflictedFiles(projectPath: string): Promise<string[]> {
    const result = await this.gitExec(projectPath, ['diff', '--name-only', '--diff-filter=U'])
    if (!result.stdout.trim()) return []
    return result.stdout.trim().split('\n').filter(Boolean)
  }

  async abortMerge(projectPath: string): Promise<GitCommandResult> {
    return this.gitExec(projectPath, ['merge', '--abort'])
  }

  async generateAIPRDescription(
    projectPath: string,
    defaultBranch: string
  ): Promise<{ title: string; body: string }> {
    const [logResult, diffStatResult] = await Promise.all([
      this.gitExec(projectPath, ['log', `origin/${defaultBranch}..HEAD`, '--oneline']),
      this.gitExec(projectPath, ['diff', `origin/${defaultBranch}...HEAD`, '--stat'])
    ])

    const prompt = `Generate a GitHub PR title and description for these changes. Output in this exact format:\nTITLE: <short title under 70 chars>\nBODY: <markdown description with a summary section and key changes>\n\nCommits:\n${logResult.stdout}\n\nDiff stat:\n${diffStatResult.stdout}`

    const result = await this.exec(projectPath, 'claude', ['-p', prompt], null, AI_TIMEOUT)
    const output = result.stdout.trim()

    const titleMatch = output.match(/TITLE:\s*(.+)/)
    const bodyMatch = output.match(/BODY:\s*([\s\S]+)/)

    return {
      title: titleMatch?.[1]?.trim() || 'Update',
      body: bodyMatch?.[1]?.trim() || output
    }
  }

  async createPR(
    projectPath: string,
    title: string,
    body: string,
    baseBranch: string
  ): Promise<PRResult> {
    try {
      const result = await this.exec(
        projectPath, 'gh',
        ['pr', 'create', '--title', title, '--body', body, '--base', baseBranch],
        null, GIT_TIMEOUT
      )
      if (!result.success) {
        if (result.stderr.includes('already exists')) {
          const viewResult = await this.exec(
            projectPath, 'gh', ['pr', 'view', '--json', 'url', '-q', '.url'],
            null, 10_000
          )
          return { success: true, url: viewResult.stdout.trim(), message: 'PR already exists' }
        }
        return { success: false, message: result.stderr || 'PR creation failed' }
      }
      return { success: true, url: result.stdout.trim(), message: 'PR created' }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) }
    }
  }

  // ─── Workflow Runner ──────────────────────────────────────

  async runCommands(
    projectPath: string,
    commands: string[],
    identity?: GitIdentity | null
  ): Promise<GitWorkflowResult> {
    const steps: GitCommandResult[] = []

    for (let i = 0; i < commands.length; i++) {
      const parts = commands[i].split(/\s+/)
      const cmd = parts[0]
      const args = parts.slice(1)
      const result = await this.exec(projectPath, cmd, args, identity)
      steps.push(result)

      if (!result.success) {
        return { success: false, steps, abortedAt: i }
      }
    }

    return { success: true, steps }
  }
}
