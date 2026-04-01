import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type {
  CreateProjectPayload,
  CreateProjectResult,
  GitIdentity
} from '../shared/types'
import { SettingsManager } from './SettingsManager'
import { ProjectManager } from './ProjectManager'
import { GitOpsManager } from './git/GitOpsManager'
import { GitIdentityManager } from './git/GitIdentityManager'
import { GitHubManager } from './github/GitHubManager'

interface StepResult {
  label: string
  success: boolean
  error?: string
}

/**
 * ProjectCreationManager: Orchestrates creating a new project with
 * local directory, git init, optional GitHub repo, and Turbo registration.
 */
export class ProjectCreationManager {
  constructor(
    private settingsManager: SettingsManager,
    private projectManager: ProjectManager,
    private gitOpsManager: GitOpsManager,
    private gitIdentityManager: GitIdentityManager,
    private githubManager: GitHubManager
  ) {}

  async createProject(payload: CreateProjectPayload): Promise<CreateProjectResult> {
    const steps: StepResult[] = []
    const projectsDir = this.settingsManager.get('defaultProjectsDir') as string
    const projectPath = join(projectsDir, payload.name)
    let cloneUrl: string | undefined
    let htmlUrl: string | undefined
    let registeredProjectId: string | undefined

    // Resolve git identity for commits
    const globalOverride = this.settingsManager.get('gitIdentityGlobal') as GitIdentity | undefined
    const detected = await this.gitIdentityManager.detectGlobalIdentity()
    const identity: GitIdentity | null = globalOverride || detected

    // Step 1: Create local directory
    try {
      if (existsSync(projectPath)) {
        steps.push({ label: 'Create directory', success: false, error: 'Directory already exists' })
        return { success: false, projectPath, error: 'Directory already exists', steps }
      }
      await mkdir(projectPath, { recursive: true })
      steps.push({ label: 'Create directory', success: true })
    } catch (err) {
      steps.push({ label: 'Create directory', success: false, error: (err as Error).message })
      return { success: false, error: (err as Error).message, steps }
    }

    // Step 2: Git init
    const initResult = await this.gitOpsManager.exec(projectPath, 'git', ['init', '-b', 'main'], identity)
    steps.push({
      label: 'Initialize git',
      success: initResult.success,
      error: initResult.success ? undefined : initResult.stderr
    })
    if (!initResult.success) {
      // Still register the project even without git
      const project = this.projectManager.addProject({ name: payload.name, path: projectPath })
      registeredProjectId = project.id
      return { success: false, projectPath, projectId: registeredProjectId, error: 'Git init failed', steps }
    }

    // Steps 3-4: Fetch .gitignore and LICENSE templates concurrently
    const [gitignoreContent, licenseBody] = await Promise.all([
      payload.gitignoreTemplate
        ? this.githubManager.fetchGitignoreTemplate(payload.gitignoreTemplate).catch(() => null)
        : Promise.resolve(null),
      payload.license
        ? this.githubManager.fetchLicenseBody(payload.license).catch(() => null)
        : Promise.resolve(null)
    ])

    if (payload.gitignoreTemplate) {
      try {
        const content = gitignoreContent || 'node_modules/\n.DS_Store\n*.log\n'
        await writeFile(join(projectPath, '.gitignore'), content)
        steps.push({ label: 'Create .gitignore', success: true })
      } catch (err) {
        steps.push({ label: 'Create .gitignore', success: false, error: (err as Error).message })
      }
    }

    if (payload.license) {
      try {
        if (licenseBody) {
          const year = new Date().getFullYear()
          const authorName = identity?.name || payload.name
          const licenseText = licenseBody
            .replace(/\[year\]/g, String(year))
            .replace(/\[fullname\]/g, authorName)
          await writeFile(join(projectPath, 'LICENSE'), licenseText)
          steps.push({ label: 'Create LICENSE', success: true })
        } else {
          steps.push({ label: 'Create LICENSE', success: false, error: 'Could not fetch license template' })
        }
      } catch (err) {
        steps.push({ label: 'Create LICENSE', success: false, error: (err as Error).message })
      }
    }

    // Step 5: Create README
    if (payload.initReadme) {
      try {
        const readme = `# ${payload.name}\n\n${payload.description || ''}\n`
        await writeFile(join(projectPath, 'README.md'), readme)
        steps.push({ label: 'Create README', success: true })
      } catch (err) {
        steps.push({ label: 'Create README', success: false, error: (err as Error).message })
      }
    }

    // Step 6: Initial commit
    const stageResult = await this.gitOpsManager.exec(projectPath, 'git', ['add', '-A'], identity)
    if (stageResult.success) {
      const commitResult = await this.gitOpsManager.exec(
        projectPath, 'git', ['commit', '-m', 'Initial commit'], identity
      )
      steps.push({
        label: 'Initial commit',
        success: commitResult.success,
        error: commitResult.success ? undefined : commitResult.stderr
      })
    } else {
      steps.push({ label: 'Initial commit', success: false, error: 'Failed to stage files' })
    }

    // Step 7: Create GitHub repo (conditional)
    if (payload.createGitHubRepo) {
      const repoResult = await this.githubManager.createRepo({
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility,
        org: payload.org,
        license: '',  // We already created LICENSE locally
        gitignoreTemplate: '' // We already created .gitignore locally
      })

      steps.push({
        label: 'Create GitHub repository',
        success: repoResult.success,
        error: repoResult.success ? undefined : repoResult.error
      })

      if (repoResult.success) {
        cloneUrl = repoResult.cloneUrl
        htmlUrl = repoResult.htmlUrl

        // Step 8: Add remote origin
        const remoteResult = await this.gitOpsManager.exec(
          projectPath, 'git', ['remote', 'add', 'origin', cloneUrl!], identity
        )
        steps.push({
          label: 'Set remote origin',
          success: remoteResult.success,
          error: remoteResult.success ? undefined : remoteResult.stderr
        })

        // Step 9: Push
        if (remoteResult.success) {
          const pushResult = await this.gitOpsManager.exec(
            projectPath, 'git', ['push', '-u', 'origin', 'main'], identity
          )
          steps.push({
            label: 'Push to GitHub',
            success: pushResult.success,
            error: pushResult.success ? undefined : pushResult.stderr
          })
        }
      }
    }

    // Step 10: Register in Turbo
    const project = this.projectManager.addProject({ name: payload.name, path: projectPath })
    registeredProjectId = project.id
    steps.push({ label: 'Register project', success: true })

    const allSuccess = steps.every(s => s.success)

    return {
      success: allSuccess,
      projectPath,
      projectId: registeredProjectId,
      repoUrl: htmlUrl,
      error: allSuccess ? undefined : 'Some steps failed',
      steps
    }
  }
}
