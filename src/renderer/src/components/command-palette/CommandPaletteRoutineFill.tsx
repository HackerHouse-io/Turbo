import { useState, useRef, useEffect } from 'react'
import type { Routine } from '../../../../shared/types'
import { PaletteIcon } from './PaletteIcon'
import { camelToTitle } from '../../lib/format'

interface RoutineFillProps {
  routine: Routine
  onSubmit: (variables: Record<string, string>) => void
  onBack: () => void
}

export function CommandPaletteRoutineFill({ routine, onSubmit, onBack }: RoutineFillProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of routine.variables) {
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
        <PaletteIcon icon={routine.icon} className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text">{routine.name}</span>
        <span className="text-xs text-turbo-text-muted ml-auto">{routine.steps.length} steps</span>
      </div>

      {/* Variable inputs */}
      {routine.variables.length > 0 && (
        <div className="px-4 py-3 space-y-3 border-b border-turbo-border">
          {routine.variables.map((v, i) => (
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
        {routine.steps.map((step, i) => (
          <div key={i} className="flex gap-2 text-sm text-turbo-text-dim">
            <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                           flex items-center justify-center text-[10px] text-turbo-text-muted flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span>{step.name}</span>
                {step.permissionMode && step.permissionMode !== 'default' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                    {step.permissionMode}
                  </span>
                )}
                {step.effort && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                    {step.effort}
                  </span>
                )}
              </div>
              <p className="text-turbo-text-muted text-[11px] truncate mt-0.5">
                {step.prompt.length > 80 ? step.prompt.slice(0, 80) + '...' : step.prompt}
              </p>
            </div>
          </div>
        ))}
        {routine.endsWithCommit && (
          <div className="flex items-center gap-2 text-sm text-turbo-text-muted mt-1">
            <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                           flex items-center justify-center text-[10px] flex-shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6" />
              </svg>
            </span>
            <span className="italic">Commit & push</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-4 py-3 border-t border-turbo-border gap-2">
        <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">
          {(navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl') + '+\u21B5'}
        </kbd>
        <button
          onClick={() => onSubmit(values)}
          className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                     hover:bg-turbo-accent/90 transition-colors"
        >
          Start Routine
        </button>
      </div>
    </div>
  )
}
