import { useState, useEffect, useCallback, useRef } from 'react'
import { SettingRow, SettingSectionHeader } from '../SettingRow'
import { ToggleSwitch } from '../../shared/ToggleSwitch'
import { useGitHubStore } from '../../../stores/useGitHubStore'
import { useGitIdentityStore } from '../../../stores/useGitIdentityStore'
import {
  COMMON_LICENSES,
  COMMON_GITIGNORE_TEMPLATES,
  DEFAULT_GITHUB_REPO_DEFAULTS
} from '../../../../../shared/constants'
import type { GitIdentity, GitHubUser, GitHubOrg, GitHubAuthSource, GitHubRepoDefaults, RepoVisibility } from '../../../../../shared/types'

const SOURCE_LABELS: Record<string, string> = {
  'project-override': 'Project override',
  'project-gitconfig': 'Project .git/config',
  'global-override': 'Global override (Turbo)',
  'global-gitconfig': '~/.gitconfig',
  'none': 'Not configured'
}

const AUTH_SOURCE_LABELS: Record<string, string> = {
  'gh-cli': 'GitHub CLI',
  'classic-token': 'Classic token',
  'fine-grained-token': 'Fine-grained token'
}

export function SectionIntegrations() {
  const connected = useGitHubStore(s => s.connected)
  const source = useGitHubStore(s => s.source)
  const user = useGitHubStore(s => s.user)
  const orgs = useGitHubStore(s => s.orgs)
  const loading = useGitHubStore(s => s.loading)
  const error = useGitHubStore(s => s.error)

  return (
    <div className="space-y-8">
      <GitHubCard
        connected={connected}
        source={source}
        user={user}
        orgs={orgs}
        loading={loading}
        error={error}
      />
      {connected && <RepoDefaultsCard orgs={orgs} />}
      <GitIdentityCard />
    </div>
  )
}

// ─── GitHub Connection Card ─────────────────────────────────

interface GitHubCardProps {
  connected: boolean
  source: GitHubAuthSource | null
  user: GitHubUser | null
  orgs: GitHubOrg[]
  loading: boolean
  error: string | null
}

function GitHubCard({ connected, source, user, orgs, loading, error }: GitHubCardProps) {
  const [tokenInput, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const connectWithToken = useGitHubStore(s => s.connectWithToken)
  const disconnect = useGitHubStore(s => s.disconnect)

  const handleConnect = async () => {
    if (!tokenInput.trim()) return
    await connectWithToken(tokenInput.trim())
    setTokenInput('')
    setShowToken(false)
  }

  const handleDisconnect = async () => {
    await disconnect()
  }

  return (
    <div>
      <SettingSectionHeader title="GitHub" description="Connect to GitHub for repository management and project creation" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50">
        {connected && user ? (
          // ─── Connected State ─────────────────────
          <div>
            <div className="p-4 flex items-center gap-3">
              <img
                src={user.avatarUrl}
                alt={user.login}
                className="w-10 h-10 rounded-full border border-turbo-border"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-turbo-text">{user.name || user.login}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                    Connected
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-turbo-text-muted">@{user.login}</span>
                  {source && (
                    <span className="text-[11px] text-turbo-text-muted">
                      via {AUTH_SOURCE_LABELS[source] || source}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-turbo-border
                           text-turbo-text-dim hover:border-red-500/50 hover:text-red-400
                           transition-colors disabled:opacity-50"
              >
                {source === 'gh-cli' ? 'Using CLI' : 'Disconnect'}
              </button>
            </div>

            {orgs.length > 0 && (
              <div className="px-4 pb-3 border-t border-turbo-border pt-3">
                <span className="text-[11px] text-turbo-text-muted uppercase tracking-wide font-medium">Organizations</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {orgs.map(org => (
                    <div key={org.login} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-turbo-surface border border-turbo-border">
                      <img src={org.avatarUrl} alt={org.login} className="w-4 h-4 rounded" />
                      <span className="text-xs text-turbo-text-dim">{org.login}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // ─── Disconnected State ──────────────────
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-turbo-surface border border-turbo-border flex items-center justify-center">
                <svg className="w-5 h-5 text-turbo-text-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-turbo-text">Connect your GitHub account</p>
                <p className="text-[11px] text-turbo-text-muted mt-0.5">Create repos, push code, and manage projects directly from Turbo</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
                  placeholder="Paste your GitHub token (ghp_... or github_pat_...)"
                  className="w-full bg-turbo-bg border border-turbo-border rounded-lg pl-3 pr-20 py-2 text-sm
                             text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                             focus:border-turbo-accent/50 transition-colors font-mono"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] text-turbo-text-muted
                             hover:text-turbo-text transition-colors"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=Turbo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-turbo-accent hover:text-turbo-accent-hover transition-colors"
                  >
                    Generate classic token
                  </a>
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-turbo-accent hover:text-turbo-accent-hover transition-colors"
                  >
                    Generate fine-grained token
                  </a>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={loading || !tokenInput.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                             text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center gap-1.5"
                >
                  {loading && (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                  )}
                  Connect
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <p className="text-[11px] text-turbo-text-muted leading-relaxed">
                If you have the <span className="font-mono text-turbo-text-dim">gh</span> CLI installed and authenticated,
                Turbo will detect it automatically — no token needed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Repository Defaults Card ───────────────────────────────

interface RepoDefaultsCardProps {
  orgs: GitHubOrg[]
}

function RepoDefaultsCard({ orgs }: RepoDefaultsCardProps) {
  const [defaults, setDefaults] = useState<GitHubRepoDefaults>(DEFAULT_GITHUB_REPO_DEFAULTS)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.getSetting('githubRepoDefaults').then(stored => {
      if (stored) setDefaults(stored as GitHubRepoDefaults)
    })
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  const update = useCallback((partial: Partial<GitHubRepoDefaults>) => {
    setDefaults(prev => {
      const next = { ...prev, ...partial }
      // Debounce disk writes for text input; immediate for selects/toggles
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        window.api.setSetting('githubRepoDefaults', next)
      }, 300)
      return next
    })
  }, [])

  return (
    <div>
      <SettingSectionHeader title="Repository Defaults" description="Default settings when creating new projects with a GitHub repo" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="Visibility" description="Default repo visibility">
          <div className="h-8 flex items-center rounded-lg border border-turbo-border overflow-hidden">
            {(['private', 'public'] as RepoVisibility[]).map(v => (
              <button
                key={v}
                onClick={() => update({ visibility: v })}
                className={`h-full px-3 text-xs font-medium transition-colors ${
                  defaults.visibility === v
                    ? 'bg-turbo-accent/20 text-turbo-accent'
                    : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                }`}
              >
                {v === 'private' ? 'Private' : 'Public'}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Organization" description="Default owner for new repos">
          <div className="relative">
            <select
              value={defaults.defaultOrg}
              onChange={e => update({ defaultOrg: e.target.value })}
              className="h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-sm
                         text-turbo-text appearance-none cursor-pointer
                         hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                         transition-colors"
            >
              <option value="">Personal account</option>
              {orgs.map(o => (
                <option key={o.login} value={o.login}>{o.login}</option>
              ))}
            </select>
            <svg className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </SettingRow>

        <SettingRow label="License" description="Default open-source license">
          <div className="relative">
            <select
              value={defaults.defaultLicense}
              onChange={e => update({ defaultLicense: e.target.value })}
              className="h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-sm
                         text-turbo-text appearance-none cursor-pointer
                         hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                         transition-colors"
            >
              {COMMON_LICENSES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <svg className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </SettingRow>

        <SettingRow label=".gitignore" description="Default gitignore template">
          <div className="relative">
            <select
              value={defaults.defaultGitignore}
              onChange={e => update({ defaultGitignore: e.target.value })}
              className="h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-sm
                         text-turbo-text appearance-none cursor-pointer
                         hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                         transition-colors"
            >
              {COMMON_GITIGNORE_TEMPLATES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <svg className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </SettingRow>

        <SettingRow label="Init README" description="Create README.md with project name">
          <ToggleSwitch
            checked={defaults.autoInitReadme}
            onChange={v => update({ autoInitReadme: v })}
          />
        </SettingRow>

        <SettingRow label="Description template" description="Default repo description" vertical>
          <input
            type="text"
            value={defaults.descriptionTemplate}
            onChange={e => update({ descriptionTemplate: e.target.value })}
            placeholder="e.g. Built with Turbo"
            className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                       text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                       focus:border-turbo-accent/50 transition-colors"
          />
        </SettingRow>
      </div>
    </div>
  )
}

// ─── Git Identity Card ──────────────────────────────────────

function GitIdentityCard() {
  const globalIdentity = useGitIdentityStore(s => s.globalIdentity)
  const initialized = useGitIdentityStore(s => s.initialized)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [identitySource, setIdentitySource] = useState('none')
  const savedRef = useRef({ name: '', email: '' })

  useEffect(() => {
    if (!initialized) {
      useGitIdentityStore.getState().initialize()
    }
  }, [initialized])

  useEffect(() => {
    ;(async () => {
      const detected = await window.api.detectGlobalGitIdentity()
      if (detected) {
        setName(detected.name || '')
        setEmail(detected.email || '')
        savedRef.current = { name: detected.name || '', email: detected.email || '' }
        const stored = await window.api.getSetting('gitIdentityGlobal') as GitIdentity | null
        if (stored?.name && stored?.email) {
          setIdentitySource('global-override')
        } else {
          setIdentitySource('global-gitconfig')
        }
      }
    })()
  }, [globalIdentity])

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return
    if (name.trim() === savedRef.current.name && email.trim() === savedRef.current.email) return
    const identity: GitIdentity = { name: name.trim(), email: email.trim() }
    await useGitIdentityStore.getState().setGlobalOverride(identity)
    savedRef.current = { name: identity.name, email: identity.email }
    setIdentitySource('global-override')
  }

  return (
    <div>
      <SettingSectionHeader title="Git Identity" description="Author name and email used for git commits" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="Name" description="Global git author name">
          <input
            type="text"
            value={name}
            placeholder="Your Name"
            onChange={e => setName(e.target.value)}
            onBlur={handleSave}
            className="w-48 bg-turbo-bg border border-turbo-border rounded-lg px-2.5 py-1.5 text-xs
                       text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                       focus:border-turbo-accent/50 transition-colors"
          />
        </SettingRow>
        <SettingRow label="Email" description="Global git author email">
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-48 bg-turbo-bg border border-turbo-border rounded-lg px-2.5 py-1.5 text-xs
                       text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                       focus:border-turbo-accent/50 transition-colors"
          />
        </SettingRow>
        <SettingRow label="Source">
          <span className="text-xs text-turbo-text-muted">{SOURCE_LABELS[identitySource]}</span>
        </SettingRow>
      </div>
    </div>
  )
}
