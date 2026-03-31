import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { SettingsSidebar, type SettingsSection } from './SettingsSidebar'
import { SectionGeneral } from './sections/SectionGeneral'
import { SectionNotifications } from './sections/SectionNotifications'
import { SectionQuickActions } from './sections/SectionQuickActions'
import { SectionGit } from './sections/SectionGit'
import { SectionProjects } from './sections/SectionProjects'
import { SectionAbout } from './sections/SectionAbout'
import { SectionKeybindings } from './sections/SectionKeybindings'
import { useNotificationStore } from '../../stores/useNotificationStore'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../../../shared/constants'
import type { ClaudeModelInfo, EffortLevel, PermissionMode, GitQuickActionOverride, NotificationPreferences } from '../../../../shared/types'

export function SettingsOverlay() {
  const closeSettings = useUIStore(s => s.closeSettings)
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  // ─── State (unchanged from original) ─────────────────────
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [defaultModel, setDefaultModel] = useState<string>('')
  const [defaultEffort, setDefaultEffort] = useState<EffortLevel>('medium')
  const [defaultPermissionMode, setDefaultPermissionMode] = useState<PermissionMode>('default')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationSound, setNotificationSound] = useState(true)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [projectsDir, setProjectsDir] = useState('')
  const [dataDir, setDataDir] = useState('')
  const [gitOverrides, setGitOverrides] = useState<Record<string, string>>({})
  const [gitCustomActions, setGitCustomActions] = useState<GitQuickActionOverride[]>([])

  useEffect(() => {
    Promise.all([
      window.api.getSetting('defaultModel'),
      window.api.getSetting('defaultEffort'),
      window.api.getSetting('defaultPermissionMode'),
      window.api.getSetting('notificationsEnabled'),
      window.api.getSetting('notificationSound'),
      window.api.getSetting('notificationPreferences'),
      window.api.getSetting('defaultProjectsDir'),
      window.api.getAppPath('userData'),
      window.api.detectModels(),
      window.api.getSetting('gitQuickActionOverrides'),
      window.api.getSetting('gitCustomActions')
    ]).then(([model, effort, perm, notif, sound, notifPrefs, dir, userData, detectedModels, gitOvr, gitCust]) => {
      if (model) setDefaultModel(model as string)
      if (effort) setDefaultEffort(effort as EffortLevel)
      if (perm) setDefaultPermissionMode(perm as PermissionMode)
      if (notif != null) setNotificationsEnabled(notif as boolean)
      if (sound != null) setNotificationSound(sound as boolean)
      if (notifPrefs) setNotificationPreferences(notifPrefs as NotificationPreferences)
      if (dir) setProjectsDir(dir as string)
      setDataDir(userData as string)
      setModels(detectedModels as ClaudeModelInfo[])
      if (gitOvr) setGitOverrides(gitOvr as Record<string, string>)
      if (gitCust) setGitCustomActions(gitCust as GitQuickActionOverride[])
    })
  }, [])

  const save = useCallback((key: string, value: unknown) => {
    window.api.setSetting(key, value)
  }, [])

  const handleBrowseDir = useCallback(async () => {
    const path = await window.api.openFolderDialog()
    if (path) {
      setProjectsDir(path)
      save('defaultProjectsDir', path)
    }
  }, [save])

  // ─── Section router ──────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <SectionGeneral
            models={models}
            defaultModel={defaultModel}
            defaultEffort={defaultEffort}
            defaultPermissionMode={defaultPermissionMode}
            onModelChange={v => { setDefaultModel(v); save('defaultModel', v) }}
            onEffortChange={v => { setDefaultEffort(v); save('defaultEffort', v) }}
            onPermissionChange={v => { setDefaultPermissionMode(v); save('defaultPermissionMode', v) }}
          />
        )
      case 'notifications':
        return (
          <SectionNotifications
            notificationsEnabled={notificationsEnabled}
            notificationSound={notificationSound}
            notificationPreferences={notificationPreferences}
            onToggle={v => {
              setNotificationsEnabled(v); save('notificationsEnabled', v)
              useNotificationStore.getState().setMasterEnabled(v)
            }}
            onSoundToggle={v => { setNotificationSound(v); save('notificationSound', v) }}
            onPreferencesChange={v => {
              setNotificationPreferences(v); save('notificationPreferences', v)
              useNotificationStore.getState().setPreferences(v)
            }}
          />
        )
      case 'quickActions':
        return (
          <SectionQuickActions
            gitOverrides={gitOverrides}
            gitCustomActions={gitCustomActions}
            onOverridesChange={next => { setGitOverrides(next); save('gitQuickActionOverrides', next) }}
            onCustomActionsChange={next => { setGitCustomActions(next); save('gitCustomActions', next) }}
          />
        )
      case 'keybindings':
        return <SectionKeybindings />
      case 'git':
        return <SectionGit />
      case 'projects':
        return (
          <SectionProjects
            projectsDir={projectsDir}
            onDirChange={setProjectsDir}
            onBrowse={handleBrowseDir}
            onBlurSave={() => save('defaultProjectsDir', projectsDir)}
          />
        )
      case 'about':
        return <SectionAbout dataDir={dataDir} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[45] flex flex-col bg-turbo-bg"
    >
      {/* Header bar */}
      <div className="drag-region h-12 flex-shrink-0 flex items-center pl-[80px] pr-4 border-b border-turbo-border">
        <button
          onClick={closeSettings}
          className="no-drag flex items-center gap-2 text-turbo-text-muted hover:text-turbo-text transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className="ml-4 text-sm font-medium text-turbo-text">Settings</span>
        <div className="flex-1" />
        <button
          onClick={closeSettings}
          className="no-drag p-1.5 rounded-lg hover:bg-turbo-surface-hover text-turbo-text-muted hover:text-turbo-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar active={activeSection} onChange={setActiveSection} />

        {/* Content panel — fixed position, only inner content animates */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
