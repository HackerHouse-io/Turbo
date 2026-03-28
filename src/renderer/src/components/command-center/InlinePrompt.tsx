import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../stores/useProjectStore'

export function InlinePrompt() {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedProject || isSubmitting) return

    setIsSubmitting(true)
    try {
      await window.api.createSession({
        projectPath: selectedProject.path,
        prompt: prompt.trim(),
        name: prompt.trim().slice(0, 60)
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
    <div className="mt-6 max-w-2xl mx-auto w-full">
      <div className="relative bg-turbo-surface border border-turbo-border rounded-xl
                      focus-within:border-turbo-accent/50 transition-colors overflow-hidden">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to work on?"
          rows={2}
          disabled={isSubmitting}
          className="w-full px-4 pt-3 pb-8 bg-transparent text-sm text-turbo-text
                     placeholder:text-turbo-text-muted resize-none
                     focus:outline-none disabled:opacity-50"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className="text-[10px] text-turbo-text-muted">
            <kbd className="kbd">&#8984;&#8617;</kbd>
          </span>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isSubmitting}
            className="px-3 py-1 rounded-md text-xs font-medium
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
  )
}
