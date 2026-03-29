import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { XTermRenderer } from './XTermRenderer'
import { PaletteIcon } from '../command-palette/PaletteIcon'

export function TerminalDrawer() {
  const target = useUIStore(s => s.terminalDrawerTarget)
  const closeTerminalDrawer = useUIStore(s => s.closeTerminalDrawer)

  const isPlain = target?.type === 'plain'
  const terminalId = target
    ? target.type === 'session' ? target.sessionId : target.terminalId
    : null

  const session = useSessionStore(s =>
    target?.type === 'session' ? s.sessions[target.sessionId] : undefined
  )

  if (!terminalId) return null

  const handleKill = async () => {
    if (isPlain) {
      await window.api.killPlainTerminal(terminalId)
    }
    closeTerminalDrawer()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      {/* Backdrop (click to close) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 bg-black/40"
        onClick={closeTerminalDrawer}
      />

      {/* Terminal drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-[60vh] bg-turbo-bg border-t border-turbo-border flex flex-col"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-turbo-border bg-turbo-surface/50">
          <div className="flex items-center gap-2">
            <PaletteIcon icon="terminal" className="w-4 h-4 text-turbo-accent" />
            <span className="text-xs font-medium text-turbo-text">
              {isPlain ? 'Terminal' : (session?.name || 'Terminal')}
            </span>
            {isPlain ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface-active text-turbo-text-muted font-mono">
                shell
              </span>
            ) : (
              <span className="text-[10px] text-turbo-text-muted font-mono">
                {terminalId.slice(0, 8)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPlain && (
              <button
                onClick={handleKill}
                className="p-1 rounded hover:bg-red-500/20 text-turbo-text-muted hover:text-red-400 transition-colors"
                title="Kill terminal"
              >
                <PaletteIcon icon="trash" className="w-4 h-4" />
              </button>
            )}
            <span className="text-[10px] text-turbo-text-muted">
              <kbd className="kbd">Esc</kbd> to close
            </span>
            <button
              onClick={closeTerminalDrawer}
              className="p-1 rounded hover:bg-turbo-surface-active text-turbo-text-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal content */}
        <div className="flex-1 overflow-hidden">
          <XTermRenderer terminalId={terminalId} mode={isPlain ? 'plain' : 'session'} />
        </div>
      </motion.div>
    </div>
  )
}
