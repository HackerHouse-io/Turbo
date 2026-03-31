import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaybookStore } from '../../stores/usePlaybookStore'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { PaletteIconName } from '../command-palette/PaletteIcon'

interface TaskPlaybookPickerProps {
  onSelect: (playbookId: string) => Promise<void>
  defaultPlaybookId: string | null
  onSetDefault: (playbookId: string) => void
}

export function TaskPlaybookPicker({ onSelect, defaultPlaybookId, onSetDefault }: TaskPlaybookPickerProps) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const allPlaybooks = usePlaybookStore(s => s.playbooks)
  const runnablePlaybooks = allPlaybooks.filter(p => p.endsWithCommit)
  const defaultPb = runnablePlaybooks.find(p => p.id === defaultPlaybookId) ?? runnablePlaybooks[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Clear error after a few seconds
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  const runPlaybook = useCallback(async (playbookId: string) => {
    setRunning(true)
    setError(null)
    try {
      await onSelect(playbookId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task')
    } finally {
      setRunning(false)
    }
  }, [onSelect])

  const handleRunDefault = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (defaultPb && !running) {
      runPlaybook(defaultPb.id)
    }
  }, [defaultPb, running, runPlaybook])

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(prev => !prev)
  }, [])

  const handlePickPlaybook = useCallback((playbookId: string) => {
    onSetDefault(playbookId)
    setOpen(false)
    runPlaybook(playbookId)
  }, [runPlaybook, onSetDefault])

  if (!defaultPb) return null

  return (
    <div className="relative flex items-center gap-0.5 flex-shrink-0">
      {/* Main run button */}
      <button
        onClick={handleRunDefault}
        disabled={running}
        className="flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-l-md
                   bg-turbo-accent/10 text-turbo-accent text-[11px] font-medium
                   hover:bg-turbo-accent/20 transition-colors border border-turbo-accent/20
                   disabled:opacity-50 disabled:cursor-wait"
        title={`Run: ${defaultPb.name}`}
      >
        {running ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-turbo-accent border-t-transparent animate-spin flex-shrink-0" />
        ) : (
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
            <path d="M4 2.5L11 7L4 11.5V2.5Z" fill="currentColor" />
          </svg>
        )}
        <span className="max-w-[100px] truncate">{defaultPb.name}</span>
      </button>

      {/* Dropdown toggle */}
      <button
        ref={btnRef}
        onClick={handleToggleMenu}
        disabled={running}
        className="flex items-center h-6 px-1 rounded-r-md
                   bg-turbo-accent/10 text-turbo-accent
                   hover:bg-turbo-accent/20 transition-colors border border-turbo-accent/20 border-l-0
                   disabled:opacity-50"
        title="Choose playbook"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-full mt-1 z-50 px-2 py-1 rounded text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 whitespace-nowrap"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 z-50 bg-turbo-surface border border-turbo-border rounded-lg shadow-2xl py-1 min-w-[200px]"
          >
            <div className="px-3 py-1 text-[10px] text-turbo-text-muted uppercase tracking-wide">
              Run with playbook
            </div>
            {runnablePlaybooks.map(pb => (
              <button
                key={pb.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePickPlaybook(pb.id)
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-turbo-text hover:bg-turbo-surface-hover transition-colors flex items-center gap-2"
              >
                <PaletteIcon icon={pb.icon as PaletteIconName} className="w-3.5 h-3.5 text-turbo-text-dim" />
                <span className="flex-1">{pb.name}</span>
                {pb.id === defaultPb.id && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-turbo-accent">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
