import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitHubStore } from '../../stores/useGitHubStore'
import { ToggleSwitch } from '../shared/ToggleSwitch'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import {
  COMMON_LICENSES,
  COMMON_GITIGNORE_TEMPLATES,
  DEFAULT_GITHUB_REPO_DEFAULTS
} from '../../../../shared/constants'
import type { GitHubRepoDefaults, RepoVisibility, CreateProjectResult } from '../../../../shared/types'

type Step = 'name' | 'configure' | 'creating'

export function CreateProjectOverlay() {
  const close = useUIStore(s => s.closeCreateProjectOverlay)
  const ghConnected = useGitHubStore(s => s.connected)
  const ghOrgs = useGitHubStore(s => s.orgs)

  const [step, setStep] = useState<Step>('name')
  const [projectName, setProjectName] = useState('')
  const [projectsDir, setProjectsDir] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const [config, setConfig] = useState<ProjectConfig>({
    description: '',
    createGitHubRepo: ghConnected,
    visibility: 'private',
    org: '',
    license: 'MIT',
    gitignoreTemplate: 'Node',
    initReadme: true
  })
  const updateConfig = useCallback((partial: Partial<ProjectConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
  }, [])

  const [result, setResult] = useState<CreateProjectResult | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    useGitHubStore.getState().refreshStatus()
    window.api.getSetting('defaultProjectsDir').then(dir => {
      if (dir) setProjectsDir(dir as string)
    })
    window.api.getSetting('githubRepoDefaults').then(stored => {
      const defaults = (stored as GitHubRepoDefaults) || DEFAULT_GITHUB_REPO_DEFAULTS
      setConfig(prev => ({
        ...prev,
        visibility: defaults.visibility,
        org: defaults.defaultOrg,
        license: defaults.defaultLicense,
        gitignoreTemplate: defaults.defaultGitignore,
        initReadme: defaults.autoInitReadme,
        description: defaults.descriptionTemplate || prev.description
      }))
    })
  }, [])

  useEffect(() => {
    if (!ghConnected) setConfig(prev => ({ ...prev, createGitHubRepo: false }))
  }, [ghConnected])

  const validateName = useCallback((name: string) => {
    if (!name.trim()) {
      setNameError(null)
      return false
    }
    if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) {
      setNameError('Contains invalid characters')
      return false
    }
    if (name.startsWith('.') || name.startsWith('-')) {
      setNameError('Cannot start with . or -')
      return false
    }
    if (name.length > 100) {
      setNameError('Name too long')
      return false
    }
    setNameError(null)
    return true
  }, [])

  const handleNameChange = (value: string) => {
    setProjectName(value)
    validateName(value)
  }

  const handleNext = () => {
    if (validateName(projectName) && projectName.trim()) {
      setStep('configure')
    }
  }

  const handleCreate = async () => {
    setStep('creating')
    setCreating(true)
    try {
      const res = await window.api.createNewProject({
        name: projectName.trim(),
        description: config.description,
        createGitHubRepo: config.createGitHubRepo && ghConnected,
        visibility: config.visibility,
        org: config.org,
        license: config.license,
        gitignoreTemplate: config.gitignoreTemplate,
        initReadme: config.initReadme
      })
      setResult(res)
    } catch (err) {
      setResult({
        success: false,
        error: (err as Error).message,
        steps: [{ label: 'Create project', success: false, error: (err as Error).message }]
      })
    } finally {
      setCreating(false)
    }
  }

  const handleOpenProject = async () => {
    if (result?.projectId) {
      await useProjectStore.getState().refreshProjects()
      useProjectStore.getState().selectProject(result.projectId)
    }
    close()
  }

  const handleClose = () => {
    if (creating) return // Don't close while creating
    close()
  }

  const handleConnectGitHub = useCallback(() => {
    close()
    useUIStore.getState().openSettings('integrations')
  }, [close])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-turbo-bg border border-turbo-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-turbo-border">
          <div>
            <h2 className="text-sm font-semibold text-turbo-text">New Project</h2>
            <p className="text-[11px] text-turbo-text-muted mt-0.5">
              {step === 'name' && 'Choose a name for your project'}
              {step === 'configure' && 'Configure your project settings'}
              {step === 'creating' && 'Setting up your project...'}
            </p>
          </div>
          {!creating && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-turbo-surface-hover text-turbo-text-muted hover:text-turbo-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <AnimatePresence mode="wait">
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <NameStep
                  name={projectName}
                  projectsDir={projectsDir}
                  error={nameError}
                  onChange={handleNameChange}
                  onSubmit={handleNext}
                />
              </motion.div>
            )}

            {step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <ConfigureStep
                  config={config}
                  ghConnected={ghConnected}
                  orgs={ghOrgs}
                  onUpdate={updateConfig}
                  onConnectGitHub={handleConnectGitHub}
                />
              </motion.div>
            )}

            {step === 'creating' && (
              <motion.div
                key="creating"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                <CreatingStep result={result} creating={creating} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-turbo-border flex items-center justify-between">
          {step === 'name' && (
            <>
              <button onClick={handleClose} className="px-3 py-1.5 rounded-lg text-xs text-turbo-text-muted hover:text-turbo-text transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!projectName.trim() || !!nameError}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                           text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {step === 'configure' && (
            <>
              <button onClick={() => setStep('name')} className="px-3 py-1.5 rounded-lg text-xs text-turbo-text-muted hover:text-turbo-text transition-colors flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                           text-white transition-colors"
              >
                Create Project
              </button>
            </>
          )}

          {step === 'creating' && !creating && (
            <>
              <div />
              {result?.success ? (
                <button
                  onClick={handleOpenProject}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                             text-white transition-colors"
                >
                  Open Project
                </button>
              ) : (
                <button onClick={handleClose} className="px-4 py-1.5 rounded-lg text-xs font-medium border border-turbo-border text-turbo-text-dim hover:text-turbo-text transition-colors">
                  Close
                </button>
              )}
            </>
          )}

          {step === 'creating' && creating && (
            <div className="w-full flex justify-center">
              <svg className="w-4 h-4 animate-spin text-turbo-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Step Components ──────────────────────────────────────────

function NameStep({
  name, projectsDir, error, onChange, onSubmit
}: {
  name: string
  projectsDir: string
  error: string | null
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-turbo-text-dim mb-1.5">Project name</label>
        <input
          type="text"
          value={name}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          autoFocus
          placeholder="my-awesome-project"
          className="w-full bg-turbo-surface border border-turbo-border rounded-lg px-3 py-2.5 text-sm
                     text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                     focus:border-turbo-accent/50 transition-colors"
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {name.trim() && !error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-turbo-surface border border-turbo-border">
          <svg className="w-3.5 h-3.5 text-turbo-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="text-xs text-turbo-text-muted font-mono truncate">{projectsDir}/{name.trim()}</span>
        </div>
      )}
    </div>
  )
}

interface ProjectConfig {
  description: string
  createGitHubRepo: boolean
  visibility: RepoVisibility
  org: string
  license: string
  gitignoreTemplate: string
  initReadme: boolean
}

function ConfigureStep({
  config, ghConnected, orgs, onUpdate, onConnectGitHub
}: {
  config: ProjectConfig
  ghConnected: boolean
  orgs: { login: string; avatarUrl: string }[]
  onUpdate: (partial: Partial<ProjectConfig>) => void
  onConnectGitHub: () => void
}) {
  const selectClass = `h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-xs
                       text-turbo-text appearance-none cursor-pointer
                       hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                       transition-colors`

  const showGitHub = config.createGitHubRepo

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-turbo-text-dim mb-1.5">Description</label>
        <input
          type="text"
          value={config.description}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="A brief description of your project"
          className="w-full bg-turbo-surface border border-turbo-border rounded-lg px-3 py-2 text-sm
                     text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                     focus:border-turbo-accent/50 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-turbo-text-dim">Create GitHub repository</span>
        <ToggleSwitch
          checked={config.createGitHubRepo}
          onChange={v => onUpdate({ createGitHubRepo: v })}
        />
      </div>

      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        {showGitHub && !ghConnected && (
          <div className="py-2.5 px-3 flex items-center justify-between bg-turbo-accent/5">
            <div className="flex items-center gap-2 min-w-0">
              <PaletteIcon icon="info-circle" className="w-3.5 h-3.5 text-turbo-accent flex-shrink-0" />
              <span className="text-[11px] text-turbo-text-dim truncate">
                GitHub not connected — repo will be local only
              </span>
            </div>
            <button
              onClick={onConnectGitHub}
              className="px-2.5 h-6 rounded-md text-[11px] font-medium bg-turbo-accent/20 text-turbo-accent hover:bg-turbo-accent/30 transition-colors flex-shrink-0"
            >
              Connect
            </button>
          </div>
        )}
        {showGitHub && (
          <>
            <div className="py-2.5 px-3 flex items-center justify-between">
              <span className="text-xs text-turbo-text-dim">Visibility</span>
              <div className="h-7 flex items-center rounded-lg border border-turbo-border overflow-hidden">
                {(['private', 'public'] as RepoVisibility[]).map(v => (
                  <button
                    key={v}
                    onClick={() => onUpdate({ visibility: v })}
                    className={`h-full px-2.5 text-[11px] font-medium transition-colors ${
                      config.visibility === v
                        ? 'bg-turbo-accent/20 text-turbo-accent'
                        : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                    }`}
                  >
                    {v === 'private' ? 'Private' : 'Public'}
                  </button>
                ))}
              </div>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <span className="text-xs text-turbo-text-dim">Owner</span>
              <div className="relative">
                <select value={config.org} onChange={e => onUpdate({ org: e.target.value })} className={selectClass}>
                  <option value="">Personal</option>
                  {orgs.map(o => (
                    <option key={o.login} value={o.login}>{o.login}</option>
                  ))}
                </select>
                <svg className="w-2.5 h-2.5 absolute right-2 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <span className="text-xs text-turbo-text-dim">License</span>
              <div className="relative">
                <select value={config.license} onChange={e => onUpdate({ license: e.target.value })} className={selectClass}>
                  {COMMON_LICENSES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <svg className="w-2.5 h-2.5 absolute right-2 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </>
        )}

        <div className="py-2.5 px-3 flex items-center justify-between">
          <span className="text-xs text-turbo-text-dim">.gitignore</span>
          <div className="relative">
            <select value={config.gitignoreTemplate} onChange={e => onUpdate({ gitignoreTemplate: e.target.value })} className={selectClass}>
              {COMMON_GITIGNORE_TEMPLATES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <svg className="w-2.5 h-2.5 absolute right-2 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        <div className="py-2.5 px-3 flex items-center justify-between">
          <span className="text-xs text-turbo-text-dim">Init README</span>
          <ToggleSwitch checked={config.initReadme} onChange={v => onUpdate({ initReadme: v })} />
        </div>
      </div>
    </div>
  )
}

function CreatingStep({ result, creating }: { result: CreateProjectResult | null; creating: boolean }) {
  if (!result && creating) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <svg className="w-6 h-6 animate-spin text-turbo-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-turbo-text-dim">Creating your project...</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-3">
      {result.steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {s.success ? (
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <div className="min-w-0">
            <span className={`text-xs ${s.success ? 'text-turbo-text-dim' : 'text-red-400'}`}>
              {s.label}
            </span>
            {s.error && <p className="text-[11px] text-red-400/70 truncate">{s.error}</p>}
          </div>
        </div>
      ))}

      {result.repoUrl && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-turbo-surface border border-turbo-border">
          <a
            href={result.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-turbo-accent hover:text-turbo-accent-hover transition-colors"
          >
            {result.repoUrl}
          </a>
        </div>
      )}
    </div>
  )
}
