import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { Playbook } from '../../../../shared/types'
import { PaletteIcon } from './PaletteIcon'
import { PlaybookStepList } from '../playbooks/PlaybookStepList'
import { camelToTitle, CMD_ENTER_LABEL } from '../../lib/format'
import { slugify } from '../../../../shared/utils'

interface PlaybookFillProps {
  playbook: Playbook
  onSubmit: (variables: Record<string, string>) => void
  onBack: () => void
}

export function CommandPalettePlaybookFill({ playbook, onSubmit, onBack }: PlaybookFillProps) {
  const { visibleVars, slugMap } = useMemo(() => {
    const sMap = new Map<string, string>()
    for (const v of playbook.variables) {
      if (v.endsWith('Slug')) {
        const descVar = v.replace(/Slug$/, 'Description')
        if (playbook.variables.includes(descVar)) {
          sMap.set(v, descVar)
        }
      }
    }
    return {
      visibleVars: playbook.variables.filter(v => !sMap.has(v)),
      slugMap: sMap
    }
  }, [playbook.variables])

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of visibleVars) {
      init[v] = ''
    }
    return init
  })
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const runButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (visibleVars.length > 0) {
      firstInputRef.current?.focus()
    } else {
      runButtonRef.current?.focus()
    }
  }, [visibleVars.length])

  const handleRun = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      if (dontAskAgain) {
        window.api.getSetting('playbookSkipConfirm').then((existing) => {
          const current = (existing && typeof existing === 'object' ? existing : {}) as Record<string, boolean>
          window.api.setSetting('playbookSkipConfirm', { ...current, [playbook.id]: true })
        })
      }
      const allValues = { ...values }
      const slugEntries = Array.from(slugMap.entries())
      const slugResults = await Promise.all(
        slugEntries.map(([, descVar]) => window.api.generateSlug(values[descVar] || ''))
      )
      slugEntries.forEach(([slugVar, descVar], i) => {
        allValues[slugVar] = slugResults[i] || slugify(values[descVar] || '')
      })
      onSubmit(allValues)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [dontAskAgain, playbook.id, values, slugMap, onSubmit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onBack()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !submitting) {
      e.preventDefault()
      handleRun()
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
      {visibleVars.length > 0 && (
        <div className="px-4 py-3 space-y-3 border-b border-turbo-border">
          {visibleVars.map((v, i) => (
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
      <div className="flex items-center gap-2 px-4 py-3 border-t border-turbo-border">
        {visibleVars.length === 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={e => setDontAskAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-turbo-border accent-turbo-accent"
            />
            <span className="text-[11px] text-turbo-text-muted">Don't show this again</span>
          </label>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">
            {CMD_ENTER_LABEL}
          </kbd>
          <button
            ref={runButtonRef}
            onClick={handleRun}
            disabled={submitting}
            className="h-7 text-[11px] px-3 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors
                       disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting ? 'Starting...' : 'Run Playbook'}
          </button>
        </div>
      </div>
    </div>
  )
}
