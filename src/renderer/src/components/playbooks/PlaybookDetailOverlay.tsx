import { useState, useCallback } from 'react'
import type { Playbook } from '../../../../shared/types'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { PlaybookStepList } from './PlaybookStepList'
import { useUIStore } from '../../stores/useUIStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'
import { useConfirmAction } from '../../hooks/useConfirmAction'

interface PlaybookDetailOverlayProps {
  playbook: Playbook
}

export function PlaybookDetailOverlay({ playbook }: PlaybookDetailOverlayProps) {
  const closePlaybookDetail = useUIStore(s => s.closePlaybookDetail)
  const openPlaybookEditor = useUIStore(s => s.openPlaybookEditor)
  const openCommandPaletteWithPlaybook = useUIStore(s => s.openCommandPaletteWithPlaybook)
  const deletePlaybook = usePlaybookStore(s => s.deletePlaybook)
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
    closePlaybookDetail()
    openCommandPaletteWithPlaybook(playbook)
  }, [closePlaybookDetail, openCommandPaletteWithPlaybook, playbook])

  const handleEdit = useCallback(() => {
    closePlaybookDetail()
    openPlaybookEditor(playbook, 'edit')
  }, [playbook, closePlaybookDetail, openPlaybookEditor])

  const handleDuplicate = useCallback(() => {
    closePlaybookDetail()
    openPlaybookEditor(playbook, 'duplicate')
  }, [playbook, closePlaybookDetail, openPlaybookEditor])

  const { armed: confirmDelete, trigger: handleDelete } = useConfirmAction(
    useCallback(async () => {
      await deletePlaybook(playbook.id)
      closePlaybookDetail()
    }, [deletePlaybook, playbook.id, closePlaybookDetail])
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={closePlaybookDetail} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-turbo-surface rounded-xl border border-turbo-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-turbo-border">
          <PaletteIcon icon={playbook.icon} className="w-5 h-5 text-turbo-accent" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-turbo-text truncate">{playbook.name}</h2>
            <p className="text-xs text-turbo-text-dim mt-0.5">{playbook.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {playbook.builtIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-accent/10 border border-turbo-accent/20 text-turbo-accent">
                Built-in
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
              {playbook.steps.length} steps
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          <PlaybookStepList
            steps={playbook.steps}
            endsWithCommit={playbook.endsWithCommit}
            truncateAt={120}
            onStepClick={toggleStep}
            expandedSteps={expandedSteps}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-turbo-border">
          {!playbook.builtIn && (
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
          {playbook.builtIn ? (
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
            Run Playbook
          </button>
        </div>
      </div>
    </div>
  )
}
