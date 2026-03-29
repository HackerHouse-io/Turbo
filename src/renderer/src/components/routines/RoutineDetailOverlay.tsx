import { useState, useCallback } from 'react'
import type { Routine } from '../../../../shared/types'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useUIStore } from '../../stores/useUIStore'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useConfirmAction } from '../../hooks/useConfirmAction'

interface RoutineDetailOverlayProps {
  routine: Routine
}

export function RoutineDetailOverlay({ routine }: RoutineDetailOverlayProps) {
  const closeRoutineDetail = useUIStore(s => s.closeRoutineDetail)
  const openRoutineEditor = useUIStore(s => s.openRoutineEditor)
  const openCommandPaletteWithRoutine = useUIStore(s => s.openCommandPaletteWithRoutine)
  const deleteRoutine = useRoutineStore(s => s.deleteRoutine)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = useCallback((index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleRun = useCallback(() => {
    closeRoutineDetail()
    openCommandPaletteWithRoutine(routine)
  }, [closeRoutineDetail, openCommandPaletteWithRoutine, routine])

  const handleEdit = useCallback(() => {
    closeRoutineDetail()
    openRoutineEditor(routine, 'edit')
  }, [routine, closeRoutineDetail, openRoutineEditor])

  const handleDuplicate = useCallback(() => {
    closeRoutineDetail()
    openRoutineEditor(routine, 'duplicate')
  }, [routine, closeRoutineDetail, openRoutineEditor])

  const { armed: confirmDelete, trigger: handleDelete } = useConfirmAction(
    useCallback(async () => {
      await deleteRoutine(routine.id)
      closeRoutineDetail()
    }, [deleteRoutine, routine.id, closeRoutineDetail])
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closeRoutineDetail} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-turbo-surface rounded-xl border border-turbo-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-turbo-border">
          <PaletteIcon icon={routine.icon} className="w-5 h-5 text-turbo-accent" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-turbo-text truncate">{routine.name}</h2>
            <p className="text-xs text-turbo-text-dim mt-0.5">{routine.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {routine.builtIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-accent/10 border border-turbo-accent/20 text-turbo-accent">
                Built-in
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
              {routine.steps.length} steps
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {routine.steps.map((step, i) => {
            const isExpanded = expandedSteps.has(i)
            const promptPreview = step.prompt.length > 120 ? step.prompt.slice(0, 120) + '...' : step.prompt

            return (
              <div key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                               flex items-center justify-center text-[10px] text-turbo-text-muted flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-turbo-text">{step.name}</span>
                    {step.permissionMode && step.permissionMode !== 'default' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                        {step.permissionMode}
                      </span>
                    )}
                    {step.effort && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                        {step.effort}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleStep(i)}
                    className="text-left mt-1 text-[11px] text-turbo-text-dim leading-relaxed hover:text-turbo-text-muted transition-colors"
                  >
                    {isExpanded ? step.prompt : promptPreview}
                  </button>
                </div>
              </div>
            )
          })}
          {routine.endsWithCommit && (
            <div className="flex gap-2.5 mt-1">
              <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                             flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6" />
                </svg>
              </span>
              <span className="text-xs italic text-turbo-text-muted mt-0.5">Commit & push</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-turbo-border">
          {!routine.builtIn && (
            <button
              onClick={handleDelete}
              className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                confirmDelete
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-turbo-text-muted hover:text-red-400'
              }`}
            >
              {confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>
          )}
          <div className="flex-1" />
          {routine.builtIn ? (
            <button
              onClick={handleDuplicate}
              className="text-[11px] px-3 py-1.5 rounded-md text-turbo-text-dim hover:text-turbo-text transition-colors"
            >
              Duplicate to Customize
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="text-[11px] px-3 py-1.5 rounded-md text-turbo-text-dim hover:text-turbo-text transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleRun}
            className="text-[11px] px-4 py-1.5 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 transition-colors"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  )
}
