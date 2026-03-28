import { useState, useRef, useEffect } from 'react'
import type { GitPreset } from '../../../../shared/types'
import { PaletteIcon } from './PaletteIcon'
import { camelToTitle } from '../../lib/format'

interface GitPresetFillProps {
  preset: GitPreset
  loading: boolean
  onSubmit: (commands: string[]) => void
  onBack: () => void
}

export function CommandPaletteGitPresetFill({ preset, loading, onSubmit, onBack }: GitPresetFillProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of preset.variables) {
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
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const commands = preset.commands.map(cmd => {
      let result = cmd
      for (const [key, val] of Object.entries(values)) {
        result = result.replaceAll(`{{${key}}}`, val || `[${camelToTitle(key)}]`)
      }
      return result
    })
    onSubmit(commands)
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
        <PaletteIcon icon={preset.icon} className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text">{preset.name}</span>
      </div>

      {/* Variable inputs */}
      <div className="px-4 py-3 space-y-3">
        {preset.variables.map((v, i) => (
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
              disabled={loading}
              className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                         text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                         focus:border-turbo-accent/50 transition-colors disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-turbo-border">
        <p className="text-xs text-turbo-text-muted">{preset.description}</p>
        <div className="flex items-center gap-2">
          <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">{(navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl') + '+\u21B5'}</kbd>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  )
}
