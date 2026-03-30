import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { ToggleSwitch } from '../shared/ToggleSwitch'
import { EFFORT_LEVELS, PERMISSION_MODES } from '../../../../shared/constants'
import type { ClaudeModelInfo, EffortLevel, PermissionMode } from '../../../../shared/types'

export function SettingsOverlay() {
  const closeSettings = useUIStore(s => s.closeSettings)

  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [defaultModel, setDefaultModel] = useState<string>('')
  const [defaultEffort, setDefaultEffort] = useState<EffortLevel>('medium')
  const [defaultPermissionMode, setDefaultPermissionMode] = useState<PermissionMode>('default')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [projectsDir, setProjectsDir] = useState('')
  const [dataDir, setDataDir] = useState('')

  useEffect(() => {
    Promise.all([
      window.api.getSetting('defaultModel'),
      window.api.getSetting('defaultEffort'),
      window.api.getSetting('defaultPermissionMode'),
      window.api.getSetting('notificationsEnabled'),
      window.api.getSetting('defaultProjectsDir'),
      window.api.getAppPath('userData'),
      window.api.detectModels()
    ]).then(([model, effort, perm, notif, dir, userData, detectedModels]) => {
      if (model) setDefaultModel(model as string)
      if (effort) setDefaultEffort(effort as EffortLevel)
      if (perm) setDefaultPermissionMode(perm as PermissionMode)
      if (notif != null) setNotificationsEnabled(notif as boolean)
      if (dir) setProjectsDir(dir as string)
      setDataDir(userData as string)
      setModels(detectedModels as ClaudeModelInfo[])
    })
  }, [])

  const save = (key: string, value: unknown) => {
    window.api.setSetting(key, value)
  }

  const handleBrowseDir = async () => {
    const path = await window.api.openFolderDialog()
    if (path) {
      setProjectsDir(path)
      save('defaultProjectsDir', path)
    }
  }


  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closeSettings} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-turbo-surface rounded-xl border border-turbo-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-turbo-border flex-shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-turbo-text">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-1 rounded-lg hover:bg-turbo-surface-hover text-turbo-text-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ─── Session Defaults ─────────────────────────────── */}
          <div>
            <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
              Session Defaults
            </h3>
            <div className="space-y-3">
              {/* Default model */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-turbo-text-dim">Model</span>
                <div className="relative">
                  <select
                    value={defaultModel}
                    onChange={e => { setDefaultModel(e.target.value); save('defaultModel', e.target.value) }}
                    className="h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-sm
                               text-turbo-text appearance-none cursor-pointer
                               hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                               transition-colors"
                  >
                    <option value="">Auto-detect</option>
                    {models.map(m => (
                      <option key={m.alias} value={m.alias}>{m.label}</option>
                    ))}
                  </select>
                  <svg className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Default effort */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-turbo-text-dim">Effort</span>
                <div className="h-8 flex items-center rounded-lg border border-turbo-border overflow-hidden">
                  {EFFORT_LEVELS.map(e => (
                    <button
                      key={e.value}
                      onClick={() => { setDefaultEffort(e.value); save('defaultEffort', e.value) }}
                      className={`h-full px-3 text-xs font-medium transition-colors ${
                        defaultEffort === e.value
                          ? 'bg-turbo-accent/20 text-turbo-accent'
                          : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default permission mode */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-turbo-text-dim">Permission mode</span>
                <div className="h-8 flex items-center rounded-lg border border-turbo-border overflow-hidden">
                  {PERMISSION_MODES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setDefaultPermissionMode(p.value); save('defaultPermissionMode', p.value) }}
                      className={`h-full px-3 text-xs font-medium transition-colors ${
                        defaultPermissionMode === p.value
                          ? 'bg-turbo-accent/20 text-turbo-accent'
                          : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-turbo-border" />

          {/* ─── Notifications ────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
              Notifications
            </h3>
            <ToggleSwitch
              checked={notificationsEnabled}
              onChange={(v) => { setNotificationsEnabled(v); save('notificationsEnabled', v) }}
              label="Enable OS notifications"
            />
          </div>

          <div className="border-t border-turbo-border" />

          {/* ─── Projects ─────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
              Projects
            </h3>
            <div>
              <label className="block text-[11px] font-medium text-turbo-text-muted mb-1">
                Default projects directory
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={projectsDir}
                  onChange={e => setProjectsDir(e.target.value)}
                  onBlur={() => save('defaultProjectsDir', projectsDir)}
                  placeholder="/Users/you/projects"
                  className="flex-1 bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                             text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                             focus:border-turbo-accent/50 transition-colors"
                />
                <button
                  onClick={handleBrowseDir}
                  className="h-[38px] px-3 rounded-lg border border-turbo-border text-xs font-medium
                             text-turbo-text-dim hover:border-turbo-border-bright hover:text-turbo-text
                             transition-colors"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-turbo-border" />

          {/* ─── About ────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
              About
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-turbo-text-muted">Version</span>
                <span className="text-turbo-text-dim">0.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-turbo-text-muted">Data directory</span>
                <span className="text-turbo-text-dim text-xs truncate max-w-[280px]" title={dataDir}>
                  {dataDir}
                </span>
              </div>
              <p className="text-[11px] text-turbo-text-muted pt-1">
                Settings are stored in settings.json
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
