import { useState, useRef, useEffect } from 'react'
import type { Playbook } from '../../../../shared/types'
import { PaletteIcon } from './PaletteIcon'
import { PlaybookStepList } from '../playbooks/PlaybookStepList'
import { camelToTitle, CMD_ENTER_LABEL } from '../../lib/format'

interface PlaybookFillProps {
  playbook: Playbook
  onSubmit: (variables: Record<string, string>) => void
  onBack: () => void
}

export function CommandPalettePlaybookFill({ playbook, onSubmit, onBack }: PlaybookFillProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of playbook.variables) {
      init[v] = ''
    }
    return init
  })
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onBack()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit(values)
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
        <PaletteIcon icon={playbook.icon} className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text">{playbook.name}</span>
        <span className="text-xs text-turbo-text-muted ml-auto">{playbook.steps.length} steps</span>
      </div>

      {/* Variable inputs */}
      {playbook.variables.length > 0 && (
        <div className="px-4 py-3 space-y-3 border-b border-turbo-border">
          {playbook.variables.map((v, i) => (
            <div key={v}>
              <label className="block text-xs font-medium text-turbo-text-dim mb-1">
                {camelToTitle(v)}
              </label>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type="text"
                value={values[v]}
                onChange={e => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Enter ${camelToTitle(v).toLowerCase()}...`}
                className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                           text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                           focus:border-turbo-accent/50 transition-colors"
              />
            </div>
          ))}
        </div>
      )}

      {/* Step preview */}
      <div className="px-4 py-3 space-y-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted">
          Steps
        </span>
        <PlaybookStepList steps={playbook.steps} endsWithCommit={playbook.endsWithCommit} truncateAt={80} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-4 py-3 border-t border-turbo-border gap-2">
        <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">
          {CMD_ENTER_LABEL}
        </kbd>
        <button
          onClick={() => onSubmit(values)}
          className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                     hover:bg-turbo-accent/90 transition-colors"
        >
          Run Playbook
        </button>
      </div>
    </div>
  )
}
