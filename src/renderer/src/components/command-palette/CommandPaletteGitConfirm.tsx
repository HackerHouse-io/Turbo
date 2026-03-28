import { useState, useRef, useEffect } from 'react'
import { PaletteIcon } from './PaletteIcon'

interface GitConfirmProps {
  message: string
  diffStat: string
  pushAfter: boolean
  loading: boolean
  onConfirm: (message: string) => void
  onBack: () => void
}

export function CommandPaletteGitConfirm({
  message,
  diffStat,
  pushAfter,
  loading,
  onConfirm,
  onBack
}: GitConfirmProps) {
  const [editedMessage, setEditedMessage] = useState(message)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onBack()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (editedMessage.trim()) {
        onConfirm(editedMessage.trim())
      }
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-turbo-border">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-text-muted transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <PaletteIcon icon="git-commit" className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text">
          {pushAfter ? 'Commit & Push' : 'Commit'}
        </span>
      </div>

      {/* Diff stat */}
      {diffStat && (
        <div className="px-4 pt-3">
          <pre className="text-[11px] text-turbo-text-muted font-mono bg-turbo-bg rounded-lg p-2 overflow-x-auto">
            {diffStat}
          </pre>
        </div>
      )}

      {/* Editable commit message */}
      <div className="px-4 py-3">
        <label className="block text-xs font-medium text-turbo-text-dim mb-1">Commit Message</label>
        <textarea
          ref={textareaRef}
          value={editedMessage}
          onChange={e => setEditedMessage(e.target.value)}
          rows={3}
          disabled={loading}
          className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                     text-turbo-text placeholder:text-turbo-text-muted resize-none
                     focus:outline-none focus:border-turbo-accent/50 transition-colors
                     disabled:opacity-50"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-turbo-border">
        <p className="text-xs text-turbo-text-muted">AI-generated message — edit as needed</p>
        <div className="flex items-center gap-2">
          <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">{(navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl') + '+\u21B5'}</kbd>
          <button
            onClick={() => editedMessage.trim() && onConfirm(editedMessage.trim())}
            disabled={!editedMessage.trim() || loading}
            className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Working...' : pushAfter ? 'Commit & Push' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}
