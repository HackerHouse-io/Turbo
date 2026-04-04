import { useCallback } from 'react'
import type { PlainTerminal } from '../../../../shared/types'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { XTermRenderer } from './XTermRenderer'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useDropZone } from '../../hooks/useDropZone'
import { shellQuote } from '../../lib/format'

interface WorkspacePaneProps {
  terminal: PlainTerminal
}

export function WorkspacePane({ terminal }: WorkspacePaneProps) {
  const focusedPaneId = useTerminalStore(s => s.focusedPaneId)
  const setFocusedPane = useTerminalStore(s => s.setFocusedPane)
  const isFocused = focusedPaneId === terminal.id

  const handleKill = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.killPlainTerminal(terminal.id)
  }

  const handleFileDrop = useCallback((paths: string[]) => {
    window.api.sendPlainTerminalInput(terminal.id, paths.map(shellQuote).join(' '))
  }, [terminal.id])

  const { isDragOver, dropProps } = useDropZone({ onDrop: handleFileDrop })

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden bg-turbo-bg"
      onClick={() => setFocusedPane(terminal.id)}
      {...dropProps}
    >
      {/* Compact header */}
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0 transition-colors ${
        isFocused ? 'bg-turbo-accent/10 border-turbo-accent/30' : 'bg-turbo-surface/50 border-turbo-border'
      }`}>
        <PaletteIcon
          icon={terminal.type === 'claude' ? 'bolt' : 'terminal'}
          className="w-3.5 h-3.5 text-turbo-text-muted"
        />
        <span className="text-[11px] font-medium text-turbo-text-dim flex-1 truncate">
          {terminal.type === 'claude' ? 'Claude Code' : 'Shell'}
        </span>
        <button
          onClick={handleKill}
          className="p-0.5 rounded hover:bg-red-500/20 text-turbo-text-muted hover:text-red-400 transition-colors opacity-40 hover:opacity-100 focus:opacity-100"
          title="Kill terminal"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        <XTermRenderer terminalId={terminal.id} mode="plain" />
      </div>

      {isDragOver && (
        <div className="absolute inset-0 z-10 bg-turbo-accent/10 border-2 border-dashed border-turbo-accent/50 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-turbo-accent bg-turbo-bg/80 px-3 py-1.5 rounded-lg">
            Drop to paste path
          </span>
        </div>
      )}
    </div>
  )
}
