import type { PlaybookStepDefinition } from '../../../../shared/types'
import {
  PERMISSION_MODES as PERMISSION_MODE_OPTIONS,
  EFFORT_LEVELS as EFFORT_LEVEL_OPTIONS
} from '../../../../shared/constants'

const PERMISSION_MODES = PERMISSION_MODE_OPTIONS.map(m => m.value)
const EFFORT_LEVELS = EFFORT_LEVEL_OPTIONS.map(e => e.value)

interface PlaybookStepEditorProps {
  step: PlaybookStepDefinition
  index: number
  isFirst: boolean
  isLast: boolean
  onChange: (step: PlaybookStepDefinition) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

export function PlaybookStepEditor({
  step, index, isFirst, isLast,
  onChange, onMoveUp, onMoveDown, onDelete
}: PlaybookStepEditorProps) {
  return (
    <div className="rounded-lg border border-turbo-border bg-turbo-bg p-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-turbo-surface border border-turbo-border
                         flex items-center justify-center text-[10px] text-turbo-text-muted flex-shrink-0">
          {index + 1}
        </span>
        <input
          type="text"
          value={step.name}
          onChange={e => onChange({ ...step, name: e.target.value })}
          placeholder="Step name..."
          className="flex-1 bg-transparent border-none text-sm font-medium text-turbo-text
                     placeholder:text-turbo-text-muted focus:outline-none"
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            className="p-1 rounded text-turbo-text-muted hover:text-turbo-text disabled:opacity-25 transition-colors"
            title="Move up (Alt+Up)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            className="p-1 rounded text-turbo-text-muted hover:text-turbo-text disabled:opacity-25 transition-colors"
            title="Move down (Alt+Down)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-turbo-text-muted hover:text-red-400 transition-colors"
            title="Delete step"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prompt */}
      <textarea
        value={step.prompt}
        onChange={e => onChange({ ...step, prompt: e.target.value })}
        placeholder="Prompt for this step... (supports {{variable}} syntax)"
        rows={3}
        className="w-full bg-turbo-surface border border-turbo-border rounded-md px-3 py-2 text-xs
                   text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                   focus:border-turbo-accent/50 transition-colors resize-none"
      />

      {/* Badges row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-turbo-text-muted mr-1">Mode</span>
          {PERMISSION_MODES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...step, permissionMode: m })}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                (step.permissionMode ?? 'default') === m
                  ? 'bg-turbo-accent/20 border-turbo-accent/40 text-turbo-accent'
                  : 'bg-turbo-surface border-turbo-border text-turbo-text-muted hover:border-turbo-accent/30'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-turbo-text-muted mr-1">Effort</span>
          {EFFORT_LEVELS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => onChange({ ...step, effort: e })}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                (step.effort ?? 'medium') === e
                  ? 'bg-turbo-accent/20 border-turbo-accent/40 text-turbo-accent'
                  : 'bg-turbo-surface border-turbo-border text-turbo-text-muted hover:border-turbo-accent/30'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
