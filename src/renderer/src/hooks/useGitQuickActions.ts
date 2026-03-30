import { useState, useEffect, useMemo } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { GIT_QUICK_ACTIONS } from '../../../shared/constants'
import type { GitQuickActionOverride } from '../../../shared/types'

export interface ResolvedGitAction {
  id: string
  label: string
  icon: string
  command: string
  aiCommit?: boolean
}

/**
 * Loads git quick action settings and merges built-in actions (with overrides)
 * + custom actions. Re-fetches automatically when the Settings overlay closes.
 */
export function useGitQuickActions(): ResolvedGitAction[] {
  const settingsOpen = useUIStore(s => s.settingsOpen)

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [customActions, setCustomActions] = useState<GitQuickActionOverride[]>([])

  useEffect(() => {
    if (settingsOpen) return
    Promise.all([
      window.api.getSetting('gitQuickActionOverrides'),
      window.api.getSetting('gitCustomActions')
    ]).then(([o, c]) => {
      setOverrides((o as Record<string, string>) ?? {})
      setCustomActions((c as GitQuickActionOverride[]) ?? [])
    })
  }, [settingsOpen])

  return useMemo(() => {
    const builtIns: ResolvedGitAction[] = GIT_QUICK_ACTIONS.map(a => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      command: overrides[a.id] || a.defaultCommand,
      aiCommit: a.aiCommit
    }))
    const customs: ResolvedGitAction[] = customActions.map(c => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      command: c.command
    }))
    return [...builtIns, ...customs]
  }, [overrides, customActions])
}
