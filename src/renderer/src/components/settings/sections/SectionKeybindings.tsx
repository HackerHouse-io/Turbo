import { useState, useEffect, useRef, useCallback } from 'react'
import { SettingSectionHeader } from '../SettingRow'
import { DEFAULT_KEYBINDINGS } from '../../../../../shared/constants'
import { useKeybindingsStore } from '../../../stores/useKeybindingsStore'
import { formatShortcutLabel, serializeFromEvent } from '../../../lib/keybindings'
import type { KeybindingActionId, KeybindingDefinition } from '../../../../../shared/types'

export function SectionKeybindings() {
  const getShortcut = useKeybindingsStore(s => s.getShortcut)
  const overrides = useKeybindingsStore(s => s.overrides)
  const resetAll = useKeybindingsStore(s => s.resetAll)

  const hasOverrides = Object.keys(overrides).length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SettingSectionHeader
          title="Keyboard Shortcuts"
          description="Customize keyboard shortcuts for app actions"
        />
        {hasOverrides && (
          <button
            onClick={resetAll}
            className="text-[11px] text-turbo-accent hover:text-turbo-accent/80 transition-colors whitespace-nowrap"
          >
            Reset All
          </button>
        )}
      </div>

      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        {DEFAULT_KEYBINDINGS.map(def => (
          <ShortcutRow key={def.id} def={def} />
        ))}
      </div>
    </div>
  )
}

function ShortcutRow({ def }: { def: KeybindingDefinition }) {
  const getShortcut = useKeybindingsStore(s => s.getShortcut)
  const setShortcut = useKeybindingsStore(s => s.setShortcut)
  const resetShortcut = useKeybindingsStore(s => s.resetShortcut)
  const findConflict = useKeybindingsStore(s => s.findConflict)
  const overrides = useKeybindingsStore(s => s.overrides)

  const shortcut = getShortcut(def.id)
  const isOverridden = def.id in overrides

  const [recording, setRecording] = useState(false)
  const [conflict, setConflict] = useState<KeybindingDefinition | null>(null)
  const recorderRef = useRef<HTMLDivElement>(null)

  const startRecording = useCallback(() => {
    setRecording(true)
    setConflict(null)
  }, [])

  const stopRecording = useCallback(() => {
    setRecording(false)
    setConflict(null)
  }, [])

  // Focus the recorder element when entering recording mode
  useEffect(() => {
    if (recording) recorderRef.current?.focus()
  }, [recording])

  // Handle keydown during recording
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    if (e.key === 'Escape') {
      stopRecording()
      return
    }

    const serialized = serializeFromEvent(e.nativeEvent)
    if (!serialized) return // pure modifier press

    const conflicting = findConflict(serialized, def.id)
    if (conflicting) {
      setConflict(conflicting)
      return
    }

    setShortcut(def.id, serialized)
    setRecording(false)
    setConflict(null)
  }, [recording, def.id, findConflict, setShortcut, stopRecording])

  const handleUnbind = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShortcut(def.id, null)
    setRecording(false)
    setConflict(null)
  }, [def.id, setShortcut])

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    resetShortcut(def.id)
    setRecording(false)
    setConflict(null)
  }, [def.id, resetShortcut])

  return (
    <div className="py-3 px-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="text-sm text-turbo-text-dim">{def.label}</span>
        <p className="text-[11px] text-turbo-text-muted mt-0.5">{def.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {recording ? (
          <div
            ref={recorderRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onBlur={stopRecording}
            className="h-8 px-3 rounded-lg border border-turbo-accent/50 bg-turbo-accent/5
                       flex items-center text-xs text-turbo-accent animate-pulse
                       outline-none min-w-[100px] justify-center"
          >
            {conflict ? (
              <span className="text-amber-400 animate-none text-[11px]">
                Conflicts with {conflict.label}
              </span>
            ) : (
              'Press keys...'
            )}
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="h-8 px-3 rounded-lg border border-turbo-border bg-turbo-surface
                       text-xs font-mono text-turbo-text-dim hover:border-turbo-border-bright
                       transition-colors min-w-[60px] text-center"
          >
            {formatShortcutLabel(shortcut)}
          </button>
        )}

        {/* Unbind button */}
        {shortcut && !recording && (
          <button
            onClick={handleUnbind}
            title="Unbind"
            className="p-1 rounded-md hover:bg-turbo-surface-hover text-turbo-text-muted
                       hover:text-turbo-text transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Reset link */}
        {isOverridden && !recording && (
          <button
            onClick={handleReset}
            className="text-[11px] text-turbo-accent hover:text-turbo-accent/80 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
