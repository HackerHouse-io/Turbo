import { useState, useRef, useEffect } from 'react'
import type { PromptTemplate, CreateSessionPayload } from '../../../../shared/types'
import { PaletteIcon } from './PaletteIcon'
import { camelToTitle } from '../../lib/format'

type SessionFlags = Pick<CreateSessionPayload, 'permissionMode' | 'effort'>

interface TemplateFillProps {
  template: PromptTemplate
  onSubmit: (prompt: string, flags: SessionFlags) => void
  onBack: () => void
}

export function CommandPaletteTemplateFill({ template, onSubmit, onBack }: TemplateFillProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of template.variables) {
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
    let prompt = template.template
    for (const [key, val] of Object.entries(values)) {
      prompt = prompt.replaceAll(`{{${key}}}`, val || `[${camelToTitle(key)}]`)
    }
    onSubmit(prompt, {
      permissionMode: template.permissionMode,
      effort: template.effort
    })
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
        <PaletteIcon icon={template.icon} className="w-4 h-4 text-turbo-accent" />
        <span className="text-sm font-medium text-turbo-text">{template.name}</span>
        {template.permissionMode && template.permissionMode !== 'default' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-accent/10 text-turbo-accent font-medium">
            {template.permissionMode}
          </span>
        )}
        {template.effort && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface-active text-turbo-text-dim font-medium">
            {template.effort}
          </span>
        )}
      </div>

      {/* Variable inputs */}
      <div className="px-4 py-3 space-y-3">
        {template.variables.map((v, i) => (
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

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-turbo-border">
        <p className="text-xs text-turbo-text-muted">{template.description}</p>
        <div className="flex items-center gap-2">
          <kbd className="kbd text-[10px]">{navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+\u21B5</kbd>
          <button
            onClick={handleSubmit}
            className="text-xs px-3 py-1.5 rounded-lg bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors"
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  )
}
