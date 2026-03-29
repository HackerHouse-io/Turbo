import { useState, useRef, useEffect } from 'react'

interface PlanCodeBlockProps {
  content: string
  language?: string
  onEdit: (newContent: string) => void
}

export function PlanCodeBlock({ content, language, onEdit }: PlanCodeBlockProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(content)
  }, [content])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  const save = () => {
    if (draft !== content) {
      onEdit(draft)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="relative rounded-lg bg-turbo-bg border border-turbo-accent/30 overflow-hidden">
        {language && (
          <div className="px-3 py-1 text-[10px] text-turbo-text-muted bg-white/5 border-b border-turbo-border">
            {language}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setDraft(content)
              setEditing(false)
            }
          }}
          className="w-full bg-transparent p-3 text-sm font-mono text-turbo-text outline-none resize-y min-h-[60px]"
          rows={content.split('\n').length + 1}
        />
      </div>
    )
  }

  return (
    <div
      className="relative rounded-lg bg-turbo-bg border border-turbo-border overflow-hidden cursor-text hover:border-turbo-border/80 transition-colors group"
      onClick={() => setEditing(true)}
    >
      {language && (
        <div className="px-3 py-1 text-[10px] text-turbo-text-muted bg-white/5 border-b border-turbo-border flex items-center justify-between">
          <span>{language}</span>
          <span className="opacity-0 group-hover:opacity-60 text-[10px] transition-opacity">click to edit</span>
        </div>
      )}
      <pre className="p-3 text-sm font-mono text-turbo-text overflow-x-auto">
        <code>{content}</code>
      </pre>
    </div>
  )
}
