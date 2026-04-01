import { safeStorage } from 'electron'
import { join } from 'path'
import { readFile, writeFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { GITHUB_API_BASE } from '../../shared/constants'
import type {
  GitHubUser,
  GitHubOrg,
  GitHubConnectionStatus,
  GitHubTokenValidation,
  GitHubAuthSource,
  CreateGitHubRepoPayload,
  CreateGitHubRepoResult
} from '../../shared/types'

const REQUEST_TIMEOUT = 15_000

const DISCONNECTED: GitHubConnectionStatus = {
  connected: false, source: null, user: null, orgs: [], scopes: []
}

export class GitHubManager {
  private authStorePath: string

  constructor(userDataPath: string) {
    this.authStorePath = join(userDataPath, 'github-auth.json')
  }

  // ─── Token Management ───────────────────────────────────────

  private async resolveToken(): Promise<{ token: string; source: GitHubAuthSource } | null> {
    const manual = await this.readStoredToken()
    if (manual) return manual

    const ghToken = await this.getGhCliToken()
    if (ghToken) return { token: ghToken, source: 'gh-cli' }

    return null
  }

  private getGhCliToken(): Promise<string | null> {
    return new Promise(resolve => {
      execFile('gh', ['auth', 'token'], { timeout: 5000 }, (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(null)
          return
        }
        resolve(stdout.trim())
      })
    })
  }

  private async readStoredToken(): Promise<{ token: string; source: GitHubAuthSource } | null> {
    try {
      const raw = await readFile(this.authStorePath, 'utf-8')
      const data = JSON.parse(raw)
      if (!data.encrypted || !data.source) return null
      const buffer = Buffer.from(data.encrypted, 'base64')
      const token = safeStorage.decryptString(buffer)
      return { token, source: data.source as GitHubAuthSource }
    } catch {
      return null
    }
  }

  async saveToken(pat: string): Promise<GitHubTokenValidation> {
    const validation = await this.validateToken(pat)
    if (!validation.valid) return validation

    try {
      const encrypted = safeStorage.encryptString(pat)
      const source = this.detectTokenSource(pat)
      await writeFile(this.authStorePath, JSON.stringify({
        encrypted: encrypted.toString('base64'),
        source
      }))
      validation.source = source
    } catch (err) {
      return { valid: false, error: `Failed to save token: ${(err as Error).message}` }
    }

    return validation
  }

  async removeToken(): Promise<void> {
    try {
      await unlink(this.authStorePath)
    } catch {
      // File may not exist — ignore
    }
  }

  async validateToken(pat: string): Promise<GitHubTokenValidation> {
    try {
      const resp = await this.apiFetch('/user', pat)
      if (!resp.ok) {
        if (resp.status === 401) return { valid: false, error: 'Invalid or expired token' }
        return { valid: false, error: `GitHub API error: ${resp.status}` }
      }

      const userData = await resp.json()
      return {
        valid: true,
        source: this.detectTokenSource(pat),
        user: this.mapUser(userData),
        scopes: this.parseScopes(resp)
      }
    } catch (err) {
      return { valid: false, error: `Network error: ${(err as Error).message}` }
    }
  }

  // ─── Connection Status ──────────────────────────────────────

  async getConnectionStatus(): Promise<GitHubConnectionStatus> {
    const resolved = await this.resolveToken()
    if (!resolved) return DISCONNECTED

    try {
      const [userResp, orgs] = await Promise.all([
        this.apiFetch('/user', resolved.token),
        this.fetchOrgs(resolved.token)
      ])

      if (!userResp.ok) return DISCONNECTED

      const userData = await userResp.json()
      return {
        connected: true,
        source: resolved.source,
        user: this.mapUser(userData),
        orgs,
        scopes: this.parseScopes(userResp)
      }
    } catch {
      return DISCONNECTED
    }
  }

  // ─── GitHub API Methods ─────────────────────────────────────

  async listOrgs(): Promise<GitHubOrg[]> {
    const resolved = await this.resolveToken()
    if (!resolved) return []
    return this.fetchOrgs(resolved.token)
  }

  private async fetchOrgs(token: string): Promise<GitHubOrg[]> {
    try {
      const resp = await this.apiFetch('/user/orgs', token)
      if (!resp.ok) return []
      const data = await resp.json()
      return (data as any[]).map(o => ({
        login: o.login,
        avatarUrl: o.avatar_url,
        description: o.description
      }))
    } catch {
      return []
    }
  }

  async createRepo(payload: CreateGitHubRepoPayload): Promise<CreateGitHubRepoResult> {
    const resolved = await this.resolveToken()
    if (!resolved) {
      return { success: false, error: 'Not authenticated with GitHub' }
    }

    const endpoint = payload.org ? `/orgs/${payload.org}/repos` : '/user/repos'
    const body: Record<string, unknown> = {
      name: payload.name,
      description: payload.description,
      private: payload.visibility === 'private',
      auto_init: false
    }
    if (payload.license) body.license_template = payload.license
    if (payload.gitignoreTemplate) body.gitignore_template = payload.gitignoreTemplate

    try {
      const resp = await this.apiFetch(endpoint, resolved.token, {
        method: 'POST',
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        const message = (errData as any).message || `GitHub API error: ${resp.status}`
        if (resp.status === 422) {
          return { success: false, error: `Repository name "${payload.name}" already exists or is invalid` }
        }
        return { success: false, error: message }
      }

      const repoData = await resp.json()
      return {
        success: true,
        cloneUrl: repoData.clone_url,
        sshUrl: repoData.ssh_url,
        htmlUrl: repoData.html_url
      }
    } catch (err) {
      return { success: false, error: `Network error: ${(err as Error).message}` }
    }
  }

  async fetchGitignoreTemplate(name: string, token?: string): Promise<string | null> {
    const t = token || (await this.resolveToken())?.token
    try {
      const resp = await this.apiFetch(`/gitignore/templates/${name}`, t)
      if (!resp.ok) return null
      const data = await resp.json()
      return data.source || null
    } catch {
      return null
    }
  }

  async fetchLicenseBody(spdxId: string, token?: string): Promise<string | null> {
    const t = token || (await this.resolveToken())?.token
    try {
      const resp = await this.apiFetch(`/licenses/${spdxId}`, t)
      if (!resp.ok) return null
      const data = await resp.json()
      return data.body || null
    } catch {
      return null
    }
  }

  // ─── Internal Helpers ───────────────────────────────────────

  private detectTokenSource(pat: string): GitHubAuthSource {
    return pat.startsWith('github_pat_') ? 'fine-grained-token' : 'classic-token'
  }

  private mapUser(data: any): GitHubUser {
    return {
      login: data.login,
      avatarUrl: data.avatar_url,
      name: data.name,
      email: data.email,
      plan: data.plan?.name
    }
  }

  private parseScopes(resp: Response): string[] {
    return (resp.headers.get('x-oauth-scopes') || '').split(',').map(s => s.trim()).filter(Boolean)
  }

  private apiFetch(path: string, token?: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    return fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout))
  }
}
