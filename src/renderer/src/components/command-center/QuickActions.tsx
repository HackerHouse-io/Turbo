import { useCallback } from 'react'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useUIStore } from '../../stores/useUIStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'
import { useGitQuickActions } from '../../hooks/useGitQuickActions'
import { runInTerminalDrawer, resolveGitCommand } from '../../lib/runInTerminalDrawer'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { Playbook } from '../../../../shared/types'

export function QuickActions() {
  const playbooks = usePlaybookStore(s => s.playbooks)
  const openCommandPaletteWithPlaybook = useUIStore(s => s.openCommandPaletteWithPlaybook)
  const openPlaybookEditor = useUIStore(s => s.openPlaybookEditor)
  const selectedProjectPath = useProjectStore(selectProjectPath)
  const gitActions = useGitQuickActions()

  const handlePlaybook = useCallback(async (r: Playbook) => {
    if (r.variables.length === 0 && selectedProjectPath) {
      const skip = await window.api.getSetting('playbookSkipConfirm') as Record<string, boolean> | undefined
      if (skip?.[r.id]) {
        window.api.startPlaybook({ playbookId: r.id, projectPath: selectedProjectPath, variables: {} })
        return
      }
    }
    openCommandPaletteWithPlaybook(r)
  }, [selectedProjectPath, openCommandPaletteWithPlaybook])

  const handleGitAction = useCallback(async (action: { command: string; aiCommit?: boolean }) => {
    if (!selectedProjectPath) return
    const resolved = await resolveGitCommand(selectedProjectPath, action.command, action.aiCommit)
    await runInTerminalDrawer(selectedProjectPath, resolved)
  }, [selectedProjectPath])

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-2 gap-4">
        {/* Playbooks column */}
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
            Playbooks
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {playbooks.map(r => (
              <Chip
                key={`r-${r.id}`}
                icon={r.icon}
                label={r.name}
                onClick={() => handlePlaybook(r)}
              />
            ))}
            <Chip
              icon="plus"
              label="New"
              onClick={() => openPlaybookEditor(null, 'create')}
            />
          </div>
        </div>

        {/* Git column */}
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
            Git
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {gitActions.map(g => (
              <Chip
                key={`g-${g.id}`}
                icon={g.icon}
                label={g.label}
                onClick={() => handleGitAction(g)}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

function Chip({ icon, label, onClick }: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                 transition-colors cursor-pointer
                 bg-turbo-surface border border-turbo-border text-turbo-text-dim hover:border-turbo-accent/30 hover:text-turbo-text"
    >
      <PaletteIcon icon={icon} className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
