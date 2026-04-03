import { useCallback } from 'react'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useGitQuickActions } from '../../hooks/useGitQuickActions'
import { runInTerminalDrawer, resolveGitCommand } from '../../lib/runInTerminalDrawer'
import { PaletteIcon } from '../command-palette/PaletteIcon'

export function QuickActions() {
  const selectedProjectPath = useProjectStore(selectProjectPath)
  const gitActions = useGitQuickActions()

  const handleGitAction = useCallback(async (action: { command: string; aiCommit?: boolean }) => {
    if (!selectedProjectPath) return
    const resolved = await resolveGitCommand(selectedProjectPath, action.command, action.aiCommit)
    await runInTerminalDrawer(selectedProjectPath, resolved)
  }, [selectedProjectPath])

  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
        Git
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {gitActions.map(g => (
          <button
            key={`g-${g.id}`}
            onClick={() => handleGitAction(g)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                       transition-colors cursor-pointer
                       bg-turbo-surface border border-turbo-border text-turbo-text-dim hover:border-turbo-accent/30 hover:text-turbo-text"
          >
            <PaletteIcon icon={g.icon} className="w-3.5 h-3.5" />
            {g.label}
          </button>
        ))}
      </div>
    </div>
  )
}
