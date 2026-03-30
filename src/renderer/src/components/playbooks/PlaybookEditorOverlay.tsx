import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Playbook, PlaybookStepDefinition } from '../../../../shared/types'
import { extractTemplateVariables } from '../../../../shared/templateVars'
import { CMD_ENTER_LABEL } from '../../lib/format'
import { PlaybookIconPicker } from './PlaybookIconPicker'
import { PlaybookStepEditor } from './PlaybookStepEditor'
import { ToggleSwitch } from '../shared/ToggleSwitch'
import { useUIStore } from '../../stores/useUIStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'

function makeEmptyStep(): PlaybookStepDefinition {
  return { name: '', prompt: '', permissionMode: 'default', effort: 'medium' }
}

let nextStepKey = 1

function makeDraft(source: Playbook | null, mode: 'create' | 'edit' | 'duplicate') {
  if (!source) {
    return {
      name: '',
      description: '',
      icon: 'bolt',
      builtIn: false,
      endsWithCommit: false,
      steps: [{ ...makeEmptyStep(), _key: nextStepKey++ }]
    }
  }
  return {
    name: mode === 'duplicate' ? source.name + ' (Copy)' : source.name,
    description: source.description,
    icon: source.icon,
    builtIn: false,
    endsWithCommit: source.endsWithCommit,
    steps: source.steps.map(s => ({ ...s, _key: nextStepKey++ }))
  }
}

export function PlaybookEditorOverlay() {
  const editorState = useUIStore(s => s.playbookEditorState)
  const closePlaybookEditor = useUIStore(s => s.closePlaybookEditor)
  const savePlaybook = usePlaybookStore(s => s.savePlaybook)

  const source = editorState?.playbook ?? null
  const mode = editorState?.mode ?? 'create'

  const [draft, setDraft] = useState(() => makeDraft(source, mode))

  // Reset draft when editorState changes
  useEffect(() => {
    setDraft(makeDraft(editorState?.playbook ?? null, editorState?.mode ?? 'create'))
  }, [editorState])

  const detectedVars = useMemo(
    () => extractTemplateVariables(draft.steps.map(s => s.prompt)),
    [draft.steps]
  )

  const isValid = draft.name.trim().length > 0 &&
    draft.steps.length > 0 &&
    draft.steps.every(s => s.name.trim().length > 0 && s.prompt.trim().length > 0)

  const handleSave = useCallback(async () => {
    if (!isValid) return
    const playbook: Playbook = {
      id: mode === 'edit' && source ? source.id : '',
      ...draft,
      variables: detectedVars
    }
    await savePlaybook(playbook)
    closePlaybookEditor()
  }, [isValid, mode, source, draft, detectedVars, savePlaybook, closePlaybookEditor])

  const updateStep = useCallback((index: number, step: PlaybookStepDefinition) => {
    setDraft(d => {
      const steps = [...d.steps]
      steps[index] = step
      return { ...d, steps }
    })
  }, [])

  const moveStep = useCallback((index: number, direction: -1 | 1) => {
    setDraft(d => {
      const steps = [...d.steps]
      const target = index + direction
      if (target < 0 || target >= steps.length) return d
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      return { ...d, steps }
    })
  }, [])

  const deleteStep = useCallback((index: number) => {
    setDraft(d => {
      if (d.steps.length <= 1) return d
      return { ...d, steps: d.steps.filter((_, i) => i !== index) }
    })
  }, [])

  const addStep = useCallback(() => {
    setDraft(d => ({ ...d, steps: [...d.steps, { ...makeEmptyStep(), _key: nextStepKey++ }] }))
  }, [])

  // Keyboard: Cmd+Enter to save, Escape to close
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }, [handleSave])

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closePlaybookEditor} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-turbo-surface rounded-xl border border-turbo-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-turbo-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-turbo-text">
            {mode === 'create' ? 'New Playbook' : mode === 'duplicate' ? 'Duplicate Playbook' : 'Edit Playbook'}
          </h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-turbo-text-muted mb-1">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Playbook name..."
              className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                         text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                         focus:border-turbo-accent/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-turbo-text-muted mb-1">Description</label>
            <input
              type="text"
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Brief description..."
              className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                         text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                         focus:border-turbo-accent/50 transition-colors"
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-[11px] font-medium text-turbo-text-muted mb-1">Icon</label>
            <PlaybookIconPicker selected={draft.icon} onSelect={icon => setDraft(d => ({ ...d, icon }))} />
          </div>

          {/* Ends with commit toggle */}
          <ToggleSwitch
            checked={draft.endsWithCommit}
            onChange={(v) => setDraft(d => ({ ...d, endsWithCommit: v }))}
            label="Ends with commit"
          />

          {/* Steps */}
          <div>
            <label className="block text-[11px] font-medium text-turbo-text-muted mb-2">Steps</label>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {draft.steps.map((step, i) => (
                  <motion.div key={(step as any)._key ?? i} layout>
                    <PlaybookStepEditor
                      step={step}
                      index={i}
                      isFirst={i === 0}
                      isLast={i === draft.steps.length - 1}
                      onChange={s => updateStep(i, s)}
                      onMoveUp={() => moveStep(i, -1)}
                      onMoveDown={() => moveStep(i, 1)}
                      onDelete={() => deleteStep(i)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-turbo-accent hover:text-turbo-accent/80 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Step
            </button>
          </div>

          {/* Detected variables */}
          {detectedVars.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-turbo-text-muted mb-1">
                Detected Variables
              </label>
              <div className="flex flex-wrap gap-1">
                {detectedVars.map(v => (
                  <span
                    key={v}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-turbo-accent/10 border border-turbo-accent/20 text-turbo-accent"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-turbo-border flex-shrink-0">
          <button
            onClick={closePlaybookEditor}
            className="text-[11px] px-3 py-1.5 rounded-md text-turbo-text-dim hover:text-turbo-text transition-colors"
          >
            Cancel
          </button>
          <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">
            {CMD_ENTER_LABEL}
          </kbd>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="text-[11px] px-4 py-1.5 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
