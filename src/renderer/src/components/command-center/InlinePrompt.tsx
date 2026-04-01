import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { ModelEffortSelector } from '../shared/ModelEffortSelector'
import { AttachmentChip } from './AttachmentChip'
import type { ClaudeModelInfo, EffortLevel, AttachmentInfo } from '../../../../shared/types'

export function InlinePrompt() {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [model, setModel] = useState('sonnet')
  const [effort, setEffort] = useState<EffortLevel>('medium')
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const currentResolved = useGitIdentityStore(s => s.currentResolved)

  useEffect(() => {
    // Load user defaults, then detect models
    Promise.all([
      window.api.getSetting('defaultModel'),
      window.api.getSetting('defaultEffort'),
      window.api.detectModels()
    ]).then(([savedModel, savedEffort, m]) => {
      setModels(m)
      if (savedModel) {
        setModel(savedModel as string)
      } else if (m.length > 0) {
        setModel(m[0].alias)
      }
      if (savedEffort) setEffort(savedEffort as EffortLevel)
    })
  }, [])

  const addAttachments = async (filePaths: string[]) => {
    const result = await window.api.getFileInfo(filePaths)
    if (result.files.length > 0) {
      setAttachments(prev => {
        const existingPaths = new Set(prev.map(a => a.filePath))
        const newFiles = result.files.filter(f => !existingPaths.has(f.filePath))
        return [...prev, ...newFiles]
      })
    }
    if (result.errors.length > 0) {
      console.warn('Some files could not be attached:', result.errors)
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleAttachClick = async () => {
    const paths = await window.api.openFileDialog()
    if (paths && paths.length > 0) {
      await addAttachments(paths)
    }
  }

  const handleSubmit = async () => {
    if ((!prompt.trim() && attachments.length === 0) || !selectedProject || isSubmitting) return

    setIsSubmitting(true)
    try {
      const atRefs = attachments.map(a => `@${a.filePath}`).join('\n')
      const fullPrompt = atRefs
        ? `${atRefs}\n\n${prompt.trim()}`
        : prompt.trim()

      await window.api.createSession({
        projectPath: selectedProject.path,
        prompt: fullPrompt,
        name: prompt.trim().slice(0, 60) || attachments[0]?.fileName || 'New Task',
        model,
        effort,
        attachments
      })
      setPrompt('')
      setAttachments([])
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!selectedProject) return

    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()

    const results = await Promise.all(imageItems.map(async (item) => {
      const blob = item.getAsFile()
      if (!blob) return null

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })

      return window.api.saveClipboardImage(dataUrl, selectedProject.path)
    }))

    const valid = results.filter(Boolean) as AttachmentInfo[]
    if (valid.length > 0) {
      setAttachments(prev => [...prev, ...valid])
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const paths = files.map(f => f.path).filter(Boolean)
    if (paths.length > 0) {
      await addAttachments(paths)
    }
  }

  if (!selectedProject) return null

  return (
    <div className="w-full">
      <div
        className="relative bg-turbo-surface border border-turbo-border rounded-xl
                    focus-within:border-turbo-accent/50 transition-colors overflow-visible"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-turbo-accent/60
                          bg-turbo-accent/5 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-turbo-accent font-medium">Drop files to attach</span>
          </div>
        )}
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="What do you want to work on?"
          rows={4}
          disabled={isSubmitting}
          className="w-full px-5 pt-4 pb-3 bg-transparent text-sm text-turbo-text
                     placeholder:text-turbo-text-muted resize-none
                     focus:outline-none disabled:opacity-50"
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-2">
            {attachments.map(att => (
              <AttachmentChip key={att.id} attachment={att} onRemove={removeAttachment} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-2">
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
            <button
              onClick={handleAttachClick}
              disabled={isSubmitting}
              title="Attach files"
              className="h-7 w-7 flex items-center justify-center rounded-md
                         text-turbo-text-muted hover:text-turbo-text hover:bg-turbo-surface-active
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="kbd text-[10px] h-7 flex items-center px-1.5">&#8984;&#8617;</kbd>
            <button
              onClick={handleSubmit}
              disabled={(!prompt.trim() && attachments.length === 0) || isSubmitting}
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
