import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EditableText } from './EditableText'

interface PlanCheckboxProps {
  content: string
  checked: boolean
  level: number
  onToggle: () => void
  onEdit: (newContent: string) => void
  onDelete: () => void
  onStartTask?: () => Promise<void>
}

export function PlanCheckbox({
  content,
  checked,
  level,
  onToggle,
  onEdit,
  onDelete,
  onStartTask
}: PlanCheckboxProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  const handleBuild = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onStartTask || running) return
    setRunning(true)
    setError(null)
    try {
      await onStartTask()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task')
    } finally {
      setRunning(false)
    }
  }, [onStartTask, running])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-2.5 py-1"
      style={{ marginLeft: level * 20 }}
    >
      {/* Custom checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border transition-all duration-200 flex items-center justify-center ${
          checked
            ? 'bg-turbo-accent border-turbo-accent'
            : 'border-turbo-border hover:border-turbo-accent/60'
        }`}
      >
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M2 5L4 7L8 3"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </button>

      {/* Label */}
      <span className={`flex-1 text-sm ${checked ? 'line-through opacity-50' : 'text-turbo-text'}`}>
        <EditableText
          value={content}
          onSave={onEdit}
          onDelete={onDelete}
          placeholder="Task description..."
        />
      </span>

      {/* Build button — only for unchecked tasks */}
      {onStartTask && !checked && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handleBuild}
            disabled={running}
            className="flex items-center gap-1.5 h-6 px-2.5 rounded-md
                       bg-turbo-accent/10 text-turbo-accent text-[11px] font-medium
                       hover:bg-turbo-accent/20 transition-colors border border-turbo-accent/20
                       disabled:opacity-50 disabled:cursor-wait"
          >
            {running ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full border-2 border-turbo-accent border-t-transparent animate-spin flex-shrink-0" />
                <span>Building...</span>
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M4 2.5L11 7L4 11.5V2.5Z" fill="currentColor" />
                </svg>
                <span>Build</span>
              </>
            )}
          </button>

          {/* Error tooltip */}
          {error && (
            <div className="absolute right-0 top-full mt-1 z-50 px-2.5 py-1.5 rounded text-[10px] leading-tight text-red-300 bg-red-950/90 border border-red-500/20 w-[260px] break-words shadow-lg">
              {error.split('\n').filter(l => l.includes('fatal:') || l.includes('error:'))[0]
                ?.replace(/^.*?(fatal:|error:)\s*/, '')
                ?.trim()
                || error.slice(0, 120)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
