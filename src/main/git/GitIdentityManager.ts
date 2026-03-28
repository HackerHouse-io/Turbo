import { execFile } from 'child_process'
import type { GitIdentity, ResolvedGitIdentity } from '../../shared/types'

/**
 * GitIdentityManager: Detects and resolves git identity via git config commands.
 * Stateless utility — no persistence, reads live git config each time.
 */
export class GitIdentityManager {
  async detectGlobalIdentity(): Promise<GitIdentity | null> {
    const [name, email] = await Promise.all([
      this.gitConfig('--global', 'user.name'),
      this.gitConfig('--global', 'user.email')
    ])
    if (name && email) return { name, email }
    return null
  }

  async detectProjectIdentity(projectPath: string): Promise<GitIdentity | null> {
    const [name, email] = await Promise.all([
      this.gitConfig('--local', 'user.name', projectPath),
      this.gitConfig('--local', 'user.email', projectPath)
    ])
    if (name && email) return { name, email }
    return null
  }

  async resolveIdentity(
    projectPath: string,
    projectOverride?: GitIdentity,
    globalOverride?: GitIdentity
  ): Promise<ResolvedGitIdentity> {
    // Priority: project override > project .git/config > global override > ~/.gitconfig
    if (projectOverride?.name && projectOverride?.email) {
      return { identity: projectOverride, source: 'project-override' }
    }

    const projectGit = await this.detectProjectIdentity(projectPath)
    if (projectGit) {
      return { identity: projectGit, source: 'project-gitconfig' }
    }

    if (globalOverride?.name && globalOverride?.email) {
      return { identity: globalOverride, source: 'global-override' }
    }

    const globalGit = await this.detectGlobalIdentity()
    if (globalGit) {
      return { identity: globalGit, source: 'global-gitconfig' }
    }

    return { identity: null, source: 'none' }
  }

  buildGitEnv(identity: GitIdentity): Record<string, string> {
    return {
      GIT_AUTHOR_NAME: identity.name,
      GIT_AUTHOR_EMAIL: identity.email,
      GIT_COMMITTER_NAME: identity.name,
      GIT_COMMITTER_EMAIL: identity.email
    }
  }

  private gitConfig(scope: string, key: string, cwd?: string): Promise<string | null> {
    return new Promise(resolve => {
      execFile('git', ['config', scope, key], {
        encoding: 'utf-8',
        cwd,
        timeout: 5000
      }, (err, stdout) => {
        if (err) {
          resolve(null)
        } else {
          resolve(stdout.trim() || null)
        }
      })
    })
  }
}
