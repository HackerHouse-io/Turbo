import { execFile } from 'child_process'
import { GitIdentityManager } from './GitIdentityManager'
import type {
  GitCommandResult,
  GitWorkflowResult,
  GitAIMessageResult,
  GitIdentity
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
