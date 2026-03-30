import { useCallback } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useGitStore } from '../../stores/useGitStore'
import { useCommandPaletteData } from '../command-palette/useCommandPaletteData'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { PromptTemplate, GitPreset, Routine } from '../../../../shared/types'

export function QuickActions() {
  const { templates, gitPresets, routines } = useCommandPaletteData()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openCommandPaletteWithTemplate = useUIStore(s => s.openCommandPaletteWithTemplate)
  const openCommandPaletteWithRoutine = useUIStore(s => s.openCommandPaletteWithRoutine)
  const selectedProjectPath = useProjectStore(selectProjectPath)

  const handleTemplate = useCallback((t: PromptTemplate) => {
    if (t.variables.length === 0 && selectedProjectPath) {
      window.api.createSession({
        projectPath: selectedProjectPath,
        prompt: t.template,
        name: t.name,
        permissionMode: t.permissionMode,
        effort: t.effort
      })
    } else {
      openCommandPaletteWithTemplate(t)
    }
  }, [selectedProjectPath, openCommandPaletteWithTemplate])

  const handleRoutine = useCallback((r: Routine) => {
    if (r.variables.length === 0 && selectedProjectPath) {
      window.api.startRoutine({ routineId: r.id, projectPath: selectedProjectPath, variables: {} })
    } else {
      openCommandPaletteWithRoutine(r)
    }
  }, [selectedProjectPath, openCommandPaletteWithRoutine])

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

  const hasTemplates = templates.length > 0
  const hasRoutines = routines.length > 0
  const hasGit = gitPresets.length > 0

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Templates */}
        {templates.map(t => (
          <Chip
            key={`t-${t.id}`}
            icon={t.icon}
            label={t.name}
            onClick={() => handleTemplate(t)}
          />
        ))}

        {hasTemplates && hasRoutines && <Divider />}

        {/* Routines */}
        {routines.map(r => (
          <Chip
            key={`r-${r.id}`}
            icon="routine"
            label={r.name}
            onClick={() => handleRoutine(r)}
          />
        ))}

        {(hasTemplates || hasRoutines) && hasGit && <Divider />}

        {/* Git presets */}
        {gitPresets.map(g => (
          <Chip
            key={`g-${g.id}`}
            icon={g.icon}
            label={g.name}
            onClick={() => handleGitPreset(g)}
          />
        ))}

        {/* More via Cmd+K */}
        <Chip
          icon="search"
          label="⌘K More"
          onClick={openCommandPalette}
          muted
        />
      </div>

      {/* Keyboard hints */}
      <div className="mt-2 flex items-center gap-4 text-[10px] text-turbo-text-muted">
        <span><kbd className="kbd text-[10px] px-1 py-0.5">⌘K</kbd> commands</span>
        <span><kbd className="kbd text-[10px] px-1 py-0.5">⌃`</kbd> terminal</span>
        <span><kbd className="kbd text-[10px] px-1 py-0.5">⌘⇧T</kbd> timeline</span>
      </div>
    </div>
  )
}

function Chip({ icon, label, onClick, muted }: {
  icon: string
  label: string
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                  transition-colors cursor-pointer ${
        muted
          ? 'bg-turbo-surface/50 text-turbo-text-muted hover:bg-turbo-surface-hover hover:text-turbo-text-dim'
          : 'bg-turbo-surface border border-turbo-border text-turbo-text-dim hover:border-turbo-accent/30 hover:text-turbo-text'
      }`}
    >
      <PaletteIcon icon={icon} className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-turbo-border mx-1" />
}
