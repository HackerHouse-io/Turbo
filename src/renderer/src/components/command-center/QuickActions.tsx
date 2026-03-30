import { useCallback } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useGitStore } from '../../stores/useGitStore'
import { useCommandPaletteData } from '../command-palette/useCommandPaletteData'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { GitPreset, Playbook } from '../../../../shared/types'

export function QuickActions() {
  const { gitPresets, playbooks } = useCommandPaletteData()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openCommandPaletteWithPlaybook = useUIStore(s => s.openCommandPaletteWithPlaybook)
  const selectedProjectPath = useProjectStore(selectProjectPath)

  const handlePlaybook = useCallback((r: Playbook) => {
    if (r.variables.length === 0 && selectedProjectPath) {
      window.api.startPlaybook({ playbookId: r.id, projectPath: selectedProjectPath, variables: {} })
    } else {
      openCommandPaletteWithPlaybook(r)
    }
  }, [selectedProjectPath, openCommandPaletteWithPlaybook])

  const handleGitPreset = useCallback(async (g: GitPreset) => {
    if (!selectedProjectPath) return

    if (g.flow === 'quick-commit' || g.flow === 'full-commit-push') {
      const pushAfter = g.flow === 'full-commit-push'
      const result = await useGitStore.getState().generateAIMessage(selectedProjectPath)
      if (result) {
        useGitStore.getState().setPendingCommit({
          message: result.message,
          diffStat: result.diffStat,
          pushAfter
        })
        openCommandPalette()
      }
      return
    }

    if (g.variables.length > 0) {
      openCommandPalette()
      return
    }

    await useGitStore.getState().execCommands(selectedProjectPath, g.commands)
  }, [selectedProjectPath, openCommandPalette])

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
          </div>
        </div>

        {/* Git column */}
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
            Git
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {gitPresets.map(g => (
              <Chip
                key={`g-${g.id}`}
                icon={g.icon}
                label={g.name}
                onClick={() => handleGitPreset(g)}
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

