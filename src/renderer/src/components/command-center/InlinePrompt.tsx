import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { ModelEffortSelector } from '../shared/ModelEffortSelector'
import type { ClaudeModelInfo, EffortLevel } from '../../../../shared/types'

export function InlinePrompt() {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [model, setModel] = useState('sonnet')
  const [effort, setEffort] = useState<EffortLevel>('medium')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const currentResolved = useGitIdentityStore(s => s.currentResolved)

  useEffect(() => {
    window.api.detectModels().then(m => {
      setModels(m)
      if (m.length > 0) setModel(m[0].alias)
    })
  }, [])

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedProject || isSubmitting) return

    setIsSubmitting(true)
    try {
      await window.api.createSession({
        projectPath: selectedProject.path,
        prompt: prompt.trim(),
        name: prompt.trim().slice(0, 60),
        model,
        effort
      })
      setPrompt('')
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!selectedProject) return null

  return (
    <div className="max-w-2xl mx-auto w-full mt-4">
      <div className="relative bg-turbo-surface border border-turbo-border rounded-xl
                      focus-within:border-turbo-accent/50 transition-colors overflow-visible">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to work on?"
          rows={2}
          disabled={isSubmitting}
          className="w-full px-4 pt-3 pb-3 bg-transparent text-sm text-turbo-text
                     placeholder:text-turbo-text-muted resize-none
                     focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          {models.length > 0 ? (
            <ModelEffortSelector
              models={models}
              selectedModel={model}
              selectedEffort={effort}
              onModelChange={setModel}
              onEffortChange={setEffort}
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">&#8984;&#8617;</kbd>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSubmitting}
              className="h-7 px-3 rounded-md text-[11px] font-medium
                         bg-turbo-accent text-white
                         hover:bg-turbo-accent/90
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all"
            >
              {isSubmitting ? 'Launching...' : 'Go'}
            </button>
          </div>
        </div>
      </div>
      {currentResolved?.source === 'none' && (
        <p className="mt-2 text-xs text-yellow-400/70 px-1">
          No git identity — commits may not be attributed to you
        </p>
      )}
    </div>
  )
}
