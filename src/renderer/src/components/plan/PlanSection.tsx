import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlanSection as PlanSectionType } from '../../lib/planParser'
import { PlanBlockRenderer } from './PlanBlockRenderer'
import { EditableText } from './EditableText'

interface PlanSectionProps {
  section: PlanSectionType
  id: string
  onToggleCheckbox: (lineIndex: number) => void
  onEditLine: (lineIndex: number, content: string) => void
  onDeleteLine: (lineIndex: number) => void
  onInsertLine: (afterLineIndex: number, content: string) => void
  onUpdateBlock: (lineIndex: number, lineCount: number, newContent: string) => void
}

export function PlanSection({
  section,
  id,
  onToggleCheckbox,
  onEditLine,
  onDeleteLine,
  onInsertLine,
  onUpdateBlock
}: PlanSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { heading, blocks, totalTasks, completedTasks } = section
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0
  const isComplete = totalTasks > 0 && completedTasks === totalTasks

  // Find the last line index in this section for "add task" insertion
  const lastLineIndex = blocks.length > 0
    ? blocks[blocks.length - 1].lineIndex + blocks[blocks.length - 1].lineCount - 1
    : heading.lineIndex

  const headingSize = {
    1: 'text-xl font-bold',
    2: 'text-lg font-semibold',
    3: 'text-base font-semibold',
    4: 'text-sm font-semibold',
    5: 'text-sm font-medium',
    6: 'text-xs font-medium uppercase tracking-wide'
  }[heading.level ?? 2] ?? 'text-base font-semibold'

  return (
    <div id={id} className={`mb-4 rounded-lg transition-colors ${isComplete ? 'bg-emerald-500/[0.03]' : ''}`}>
      {/* Heading row */}
      <div className="flex items-center gap-2 group">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-turbo-text-muted hover:text-turbo-text transition-colors p-0.5"
        >
          <motion.svg
            animate={{ rotate: collapsed ? -90 : 0 }}
            transition={{ duration: 0.15 }}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M4 5L7 8L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </motion.svg>
        </button>

        <div className={`flex-1 ${headingSize} text-turbo-text`}>
          <EditableText
            value={heading.content}
            onSave={(val) => onEditLine(heading.lineIndex, val)}
          />
        </div>

        {isComplete && (
          <span className="text-emerald-400 text-xs">&#10003;</span>
        )}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-2 mt-1.5 ml-6">
          <div className="flex-1 h-1 rounded-full bg-turbo-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-turbo-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-turbo-text-muted whitespace-nowrap">
            {completedTasks}/{totalTasks}
          </span>
        </div>
      )}

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-2 space-y-0.5">
              <AnimatePresence mode="popLayout">
                {blocks.map((block, i) => (
                  <PlanBlockRenderer
                    key={`${block.type}-${block.lineIndex}-${i}`}
                    block={block}
                    onToggleCheckbox={onToggleCheckbox}
                    onEditLine={onEditLine}
                    onDeleteLine={onDeleteLine}
                    onUpdateBlock={onUpdateBlock}
                  />
                ))}
              </AnimatePresence>

              {/* Add task button */}
              <button
                onClick={() => onInsertLine(lastLineIndex, '- [ ] ')}
                className="text-[11px] text-turbo-text-muted hover:text-turbo-accent transition-colors mt-1 py-1 flex items-center gap-1"
              >
                <span className="text-sm leading-none">+</span> Add task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
