import { motion } from 'framer-motion'
import { DEFAULT_KEYBINDINGS } from '../../../../shared/constants'
import { useKeybindingsStore } from '../../stores/useKeybindingsStore'
import { useUIStore } from '../../stores/useUIStore'
import { formatShortcutLabel } from '../../lib/keybindings'

export function ShortcutsOverlay() {
  const close = useUIStore(s => s.closeShortcutsOverlay)
  const getShortcut = useKeybindingsStore(s => s.getShortcut)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[48] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-md rounded-xl border border-turbo-border bg-turbo-bg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-turbo-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-turbo-text">Keyboard Shortcuts</h2>
          <button
            onClick={close}
            className="p-1 rounded-md hover:bg-turbo-surface-hover text-turbo-text-muted hover:text-turbo-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcut rows */}
        <div className="divide-y divide-turbo-border max-h-[60vh] overflow-y-auto">
          {DEFAULT_KEYBINDINGS.map(def => {
            const shortcut = getShortcut(def.id)
            return (
              <div key={def.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-turbo-text">{def.label}</span>
                  <p className="text-[11px] text-turbo-text-muted">{def.description}</p>
                </div>
                <kbd className={`text-xs px-2 py-1 rounded-md border font-mono ${
                  shortcut
                    ? 'border-turbo-border bg-turbo-surface text-turbo-text-dim'
                    : 'border-transparent text-turbo-text-muted'
                }`}>
                  {formatShortcutLabel(shortcut)}
                </kbd>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-turbo-border">
          <button
            onClick={() => { close(); useUIStore.getState().openSettings() }}
            className="text-[11px] text-turbo-accent hover:text-turbo-accent/80 transition-colors"
          >
            Customize in Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
