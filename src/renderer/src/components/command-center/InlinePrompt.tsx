import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { AttachmentChip } from './AttachmentChip'
import { BUILT_IN_INTENTS, getIntent, buildSessionPayload, DEFAULT_INTENT_ID } from '../../../../shared/intents'
import { EFFORT_LEVELS, PERMISSION_MODES } from '../../../../shared/constants'
import type { ClaudeModelInfo, AttachmentInfo, PermissionMode, EffortLevel } from '../../../../shared/types'

export function InlinePrompt() {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [model, setModel] = useState('sonnet')
  const [selectedIntentId, setSelectedIntentId] = useState(DEFAULT_INTENT_ID)
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([])
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('default')
  const [effort, setEffort] = useState<EffortLevel>('medium')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const pendingDropPaths = useUIStore(s => s.pendingDropPaths)
  const pinSession = useSessionStore(s => s.pinSession)
  const focusSession = useSessionStore(s => s.focusSession)

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const currentResolved = useGitIdentityStore(s => s.currentResolved)
  const intent = getIntent(selectedIntentId)

  useEffect(() => {
    Promise.all([
      window.api.getSetting('defaultModel'),
      window.api.getSetting('defaultIntent'),
      window.api.detectModels()
    ]).then(([savedModel, savedIntent, m]) => {
      setModels(m)
      if (savedModel) setModel(savedModel as string)
      else if (m.length > 0) setModel(m[0].alias)
      if (savedIntent && typeof savedIntent === 'string') setSelectedIntentId(savedIntent)
    })
  }, [])

  useEffect(() => {
    const i = getIntent(selectedIntentId)
    setPermissionMode(i.permissionMode)
    setEffort(i.effort)
  }, [selectedIntentId])

  useEffect(() => {
    if (pendingDropPaths.length === 0) return
    const paths = useUIStore.getState().consumeDropPaths()
    if (paths.length > 0) addAttachments(paths)
  }, [pendingDropPaths])

  const addAttachments = async (filePaths: string[]) => {
    const result = await window.api.getFileInfo(filePaths)
    if (result.files.length > 0) {
      setAttachments(prev => {
        const existingPaths = new Set(prev.map(a => a.filePath))
        const newFiles = result.files.filter(f => !existingPaths.has(f.filePath))
        return [...prev, ...newFiles]
      })
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleAttachClick = async () => {
    const paths = await window.api.openFileDialog()
    if (paths && paths.length > 0) await addAttachments(paths)
  }

  const handleSubmit = useCallback(async () => {
    if ((!prompt.trim() && attachments.length === 0) || !selectedProject) return

    setIsSubmitting(true)
    try {
      const atRefs = attachments.map(a => `@${a.filePath}`).join('\n')
      const fullPrompt = atRefs ? `${atRefs}\n\n${prompt.trim()}` : prompt.trim()

      const currentIntent = getIntent(selectedIntentId)
      const payload = buildSessionPayload(
        currentIntent,
        fullPrompt,
        selectedProject.path,
        model,
        attachments.length > 0 ? attachments : undefined
      )
      payload.permissionMode = permissionMode
      payload.effort = effort
      const session = await window.api.createSession(payload)
      pinSession(session.id)
      focusSession(session.id)
      setPrompt('')
      setAttachments([])
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [prompt, attachments, selectedProject, selectedIntentId, model, permissionMode, effort, pinSession, focusSession])

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
    if (valid.length > 0) setAttachments(prev => [...prev, ...valid])
  }

  if (!selectedProject) return null


  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Prompt card */}
      <div
        className={`relative rounded-2xl overflow-visible bg-turbo-surface border-2
          transition-[border-color,box-shadow] duration-150
          ${isFocused
            ? 'border-turbo-accent/40 shadow-lg shadow-turbo-accent/5'
            : 'border-turbo-border/30 hover:border-turbo-border/50'}
        `}
      >
        {/* Intent chips row — inside the card */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-1">
          {BUILT_IN_INTENTS.map(i => {
            const isActive = selectedIntentId === i.id
            return (
              <button
                key={i.id}
                onClick={() => setSelectedIntentId(isActive && i.id !== DEFAULT_INTENT_ID ? DEFAULT_INTENT_ID : i.id)}
                title={i.description}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                  ${isActive
                    ? 'text-white shadow-sm scale-[1.02]'
                    : 'text-turbo-text-muted hover:text-turbo-text hover:bg-white/[0.04]'
                  }
                `}
                style={isActive ? { backgroundColor: i.color } : undefined}
              >
                {i.label}
              </button>
            )
          })}

          <div className="flex-1" />

          {/* Model selector */}
          {models.length > 1 && (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-shrink-0 bg-turbo-bg/50 text-[11px] text-turbo-text-muted
                         border border-turbo-border/30 rounded-lg px-2 py-1 focus:outline-none
                         focus:border-turbo-accent/50 cursor-pointer hover:border-turbo-border/50
                         transition-colors"
            >
              {models.map(m => (
                <option key={m.alias} value={m.alias}>{m.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`What do you want to ${intent.id === DEFAULT_INTENT_ID ? 'work on' : intent.label.toLowerCase()}?`}
          rows={2}
          disabled={isSubmitting}
          className="w-full px-5 pt-2 pb-1 bg-transparent text-[13px] leading-relaxed text-turbo-text
                     placeholder:text-turbo-text-muted resize-none
                     focus:outline-none disabled:opacity-50"
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-2">
            {attachments.map(att => (
              <AttachmentChip key={att.id} attachment={att} onRemove={removeAttachment} />
            ))}
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAttachClick}
              disabled={isSubmitting}
              title="Attach files"
              className="h-7 w-7 flex items-center justify-center rounded-lg
                         text-turbo-text-muted hover:text-turbo-text hover:bg-white/[0.06]
                         disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
            {/* Permission mode pills */}
            <div className="h-6 flex items-center rounded-md border border-turbo-border/30 overflow-hidden">
              {PERMISSION_MODES.map(pm => (
                <button
                  key={pm.value}
                  onClick={() => setPermissionMode(pm.value)}
                  className={`h-full px-2 text-[10px] font-medium transition-colors ${
                    permissionMode === pm.value
                      ? 'bg-turbo-accent/20 text-turbo-accent'
                      : 'text-turbo-text-dim hover:text-turbo-text hover:bg-white/[0.06]'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {/* Effort pills */}
            <div className="h-6 flex items-center rounded-md border border-turbo-border/30 overflow-hidden">
              {EFFORT_LEVELS.map(e => (
                <button
                  key={e.value}
                  onClick={() => setEffort(e.value)}
                  className={`h-full px-2 text-[10px] font-medium transition-colors ${
                    effort === e.value
                      ? 'bg-turbo-accent/20 text-turbo-accent'
                      : 'text-turbo-text-dim hover:text-turbo-text hover:bg-white/[0.06]'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <kbd className="kbd text-[10px] h-6 flex items-center px-1.5 text-turbo-text-muted">&#8984;&#8617;</kbd>
            <button
              onClick={handleSubmit}
              disabled={(!prompt.trim() && attachments.length === 0) || isSubmitting}
              className="h-8 px-5 rounded-lg text-xs font-semibold
                         bg-turbo-accent text-white hover:bg-turbo-accent/90
                         disabled:opacity-20 disabled:cursor-not-allowed
                         transition-all active:scale-[0.97]"
            >
              {isSubmitting ? 'Starting...' : 'Go'}
            </button>
          </div>
        </div>
      </div>

      {currentResolved?.source === 'none' && (
        <p className="mt-2 text-[10px] text-yellow-400/60 px-2">
          No git identity configured
        </p>
      )}
    </div>
  )
}
