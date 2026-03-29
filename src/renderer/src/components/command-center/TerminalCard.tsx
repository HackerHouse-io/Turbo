import { useCallback } from 'react'
import { useUIStore } from '../../stores/useUIStore'
import { useConfirmAction } from '../../hooks/useConfirmAction'
import { PaletteIcon } from '../command-palette/PaletteIcon'

interface WorkspaceCardProps {
  terminalCount: number
  terminalIds: string[]
}

export function WorkspaceCard({ terminalCount, terminalIds }: WorkspaceCardProps) {
  const openTerminalWorkspace = useUIStore(s => s.openTerminalWorkspace)

  const killAll = useCallback(() => {
    for (const id of terminalIds) {
      window.api.killPlainTerminal(id)
    }
  }, [terminalIds])

  const { armed, trigger } = useConfirmAction(killAll)

  return (
    <div
      onClick={openTerminalWorkspace}
      className="card p-4 cursor-pointer group hover:border-turbo-accent/30 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-turbo-surface-active flex items-center justify-center">
          <PaletteIcon icon="terminal" className="w-4 h-4 text-turbo-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-turbo-text">Workspace</div>
          <div className="text-[11px] text-turbo-text-muted">
            {terminalCount} {terminalCount === 1 ? 'terminal' : 'terminals'} open
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); trigger() }}
          className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
            armed
              ? 'bg-red-500/20 text-red-400 opacity-100'
              : 'opacity-0 group-hover:opacity-100 text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active'
          }`}
          title={armed ? 'Click again to close all terminals' : 'Close workspace'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {armed && (
        <div className="mt-2 text-[11px] text-red-400">
          Click again to close all {terminalCount} {terminalCount === 1 ? 'terminal' : 'terminals'}
        </div>
      )}
    </div>
  )
}
