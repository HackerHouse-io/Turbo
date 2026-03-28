import { useState, useRef, useEffect } from 'react'
import type { ClaudeModelInfo, EffortLevel } from '../../../../shared/types'

const EFFORT_LEVELS: { value: EffortLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' }
]

interface ModelEffortSelectorProps {
  models: ClaudeModelInfo[]
  selectedModel: string
  selectedEffort: EffortLevel
  onModelChange: (model: string) => void
  onEffortChange: (effort: EffortLevel) => void
}

export function ModelEffortSelector({
  models,
  selectedModel,
  selectedEffort,
  onModelChange,
  onEffortChange
}: ModelEffortSelectorProps) {
  const [modelOpen, setModelOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedLabel = models.find(m => m.alias === selectedModel)?.label || selectedModel

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    if (modelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [modelOpen])

  return (
    <div className="flex items-center gap-1.5">
      {/* Model dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setModelOpen(o => !o)}
          className="h-7 flex items-center gap-1 px-2.5 rounded-md border border-turbo-border
                     text-[11px] font-medium text-turbo-text-dim
                     hover:border-turbo-border-bright transition-colors"
        >
          {selectedLabel}
          <svg className="w-2.5 h-2.5 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {modelOpen && (
          <div className="absolute bottom-full left-0 mb-1 w-28 bg-turbo-surface border border-turbo-border
                          rounded-lg shadow-2xl overflow-hidden z-50 py-0.5">
            {models.map(m => (
              <button
                key={m.alias}
                onClick={() => { onModelChange(m.alias); setModelOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                  m.alias === selectedModel
                    ? 'bg-turbo-accent/10 text-turbo-accent font-medium'
                    : 'text-turbo-text-dim hover:bg-turbo-surface-hover'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Effort pill selector */}
      <div className="h-7 flex items-center rounded-md border border-turbo-border overflow-hidden">
        {EFFORT_LEVELS.map(e => (
          <button
            key={e.value}
            type="button"
            onClick={() => onEffortChange(e.value)}
            className={`h-full px-2 text-[10px] font-medium transition-colors ${
              selectedEffort === e.value
                ? 'bg-turbo-accent/20 text-turbo-accent'
                : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}
