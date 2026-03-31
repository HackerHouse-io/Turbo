import { motion } from 'framer-motion'
import { EditableText } from './EditableText'
import { TaskPlaybookPicker } from './TaskPlaybookPicker'

interface PlanCheckboxProps {
  content: string
  checked: boolean
  level: number
  onToggle: () => void
  onEdit: (newContent: string) => void
  onDelete: () => void
  onStartTask?: (playbookId: string) => Promise<void>
  defaultPlaybookId?: string | null
  onSetDefaultPlaybook?: (playbookId: string) => void
}

export function PlanCheckbox({
  content,
  checked,
  level,
  onToggle,
  onEdit,
  onDelete,
  onStartTask,
  defaultPlaybookId,
  onSetDefaultPlaybook
}: PlanCheckboxProps) {
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

      {/* Playbook picker — only for unchecked tasks */}
      {onStartTask && !checked && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <TaskPlaybookPicker
            onSelect={(playbookId) => onStartTask(playbookId)}
            defaultPlaybookId={defaultPlaybookId ?? null}
            onSetDefault={onSetDefaultPlaybook ?? (() => {})}
          />
        </div>
      )}
    </motion.div>
  )
}
