import { useState, useRef, useEffect, useCallback } from 'react'
import { formatInline } from './formatInline'

interface EditableTextProps {
  value: string
  onSave: (newValue: string) => void
  onDelete?: () => void
  placeholder?: string
  multiline?: boolean
  className?: string
}

export function EditableText({
  value,
  onSave,
  onDelete,
  placeholder,
  multiline,
  className = ''
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setEditing(false)
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || !e.shiftKey)) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancel()
    }
  }, [save, cancel, multiline])

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      placeholder,
      className: `w-full bg-turbo-bg border border-turbo-accent/40 rounded px-2 py-1 text-turbo-text outline-none focus:border-turbo-accent transition-colors ${className}`
    }

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={3}
          {...sharedProps}
        />
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        {...sharedProps}
      />
    )
  }

  return (
    <span
      className={`group/editable inline cursor-text rounded px-1 -mx-1 hover:bg-white/5 transition-colors ${className}`}
      onClick={() => setEditing(true)}
    >
      {formatInline(value || placeholder || '')}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="ml-2 opacity-0 group-hover/editable:opacity-60 hover:!opacity-100 text-red-400 transition-opacity text-xs"
          title="Delete"
        >
          &#x00d7;
        </button>
      )}
    </span>
  )
}
