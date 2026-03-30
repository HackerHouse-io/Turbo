import { useState, useEffect } from 'react'
import { SettingRow, SettingSectionHeader } from '../SettingRow'
import { useGitIdentityStore } from '../../../stores/useGitIdentityStore'
import type { GitIdentity } from '../../../../../shared/types'

const SOURCE_LABELS: Record<string, string> = {
  'project-override': 'Project override',
  'project-gitconfig': 'Project .git/config',
  'global-override': 'Global override (Turbo)',
  'global-gitconfig': '~/.gitconfig',
  'none': 'Not configured'
}

export function SectionGit() {
  const globalIdentity = useGitIdentityStore(s => s.globalIdentity)
  const initialized = useGitIdentityStore(s => s.initialized)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('none')

  useEffect(() => {
    if (!initialized) {
      useGitIdentityStore.getState().initialize()
    }
  }, [initialized])

  useEffect(() => {
    // Detect global identity source
    ;(async () => {
      const detected = await window.api.detectGlobalGitIdentity()
      if (detected) {
        setName(detected.name || '')
        setEmail(detected.email || '')
        // Check if it came from override or gitconfig
        const stored = await window.api.getSetting('gitIdentityGlobal') as GitIdentity | null
        if (stored?.name && stored?.email) {
          setSource('global-override')
        } else {
          setSource('global-gitconfig')
        }
      }
    })()
  }, [globalIdentity])

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return
    const identity: GitIdentity = { name: name.trim(), email: email.trim() }
    await useGitIdentityStore.getState().setGlobalOverride(identity)
    setSource('global-override')
  }

  return (
    <div>
      <SettingSectionHeader title="Git" description="Git identity and version control settings" />
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
          <span className="text-xs text-turbo-text-muted">{SOURCE_LABELS[source]}</span>
        </SettingRow>
      </div>
    </div>
  )
}
