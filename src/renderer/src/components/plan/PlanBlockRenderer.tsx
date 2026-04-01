import { forwardRef } from 'react'
import type { PlanBlock } from '../../lib/planParser'
import { PlanCheckbox } from './PlanCheckbox'
import { PlanCodeBlock } from './PlanCodeBlock'
import { EditableText } from './EditableText'
import { formatInline } from './formatInline'

interface PlanBlockRendererProps {
  block: PlanBlock
  onToggleCheckbox: (lineIndex: number) => void
  onEditLine: (lineIndex: number, content: string) => void
  onDeleteLine: (lineIndex: number) => void
  onUpdateBlock: (lineIndex: number, lineCount: number, newContent: string) => void
  onStartTask?: (content: string) => Promise<void>
}

export const PlanBlockRenderer = forwardRef<HTMLDivElement, PlanBlockRendererProps>(function PlanBlockRenderer({
  block,
  onToggleCheckbox,
  onEditLine,
  onDeleteLine,
  onUpdateBlock,
  onStartTask
}, ref) {
  const content = (() => {
  switch (block.type) {
    case 'checkbox':
      return (
        <PlanCheckbox
          content={block.content}
          checked={block.checked ?? false}
          level={block.level ?? 0}
          onToggle={() => onToggleCheckbox(block.lineIndex)}
          onEdit={(val) => onEditLine(block.lineIndex, val)}
          onDelete={() => onDeleteLine(block.lineIndex)}
          onStartTask={onStartTask && !block.checked
            ? () => onStartTask!(block.content)
            : undefined
          }
        />
      )

    case 'code-block':
      return (
        <div className="my-2">
          <PlanCodeBlock
            content={block.content}
            language={block.language}
            onEdit={(newContent) => {
              const fence = block.language ? '```' + block.language : '```'
              const fullBlock = fence + '\n' + newContent + '\n```'
              onUpdateBlock(block.lineIndex, block.lineCount, fullBlock)
            }}
          />
        </div>
      )

    case 'table':
      return (
        <div className="my-2 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            {block.rows && block.rows.length > 0 && (
              <>
                <thead>
                  <tr>
                    {block.rows[0].map((cell, i) => (
                      <th
                        key={i}
                        className="text-left px-3 py-1.5 text-turbo-text-dim border-b border-turbo-border font-medium text-xs"
                      >
                        {formatInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.slice(1).map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/[0.02]">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-turbo-text border-b border-turbo-border/50 text-xs">
                          {formatInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )

    case 'blockquote':
      return (
        <div className="my-2 pl-3 border-l-2 border-turbo-accent/40 text-turbo-text-dim text-sm">
          <EditableText
            value={block.content}
            onSave={(val) => {
              const newLines = val.split('\n').map(l => '> ' + l).join('\n')
              onUpdateBlock(block.lineIndex, block.lineCount, newLines)
            }}
            multiline
          />
        </div>
      )

    case 'hr':
      return <hr className="my-4 border-turbo-border" />

    case 'list-item':
      return (
        <div className="flex items-start gap-2 py-0.5" style={{ marginLeft: (block.level ?? 0) * 20 }}>
          <span className="text-turbo-text-muted mt-1.5 text-[8px]">&#9679;</span>
          <span className="text-sm text-turbo-text flex-1">
            <EditableText
              value={block.content}
              onSave={(val) => onEditLine(block.lineIndex, val)}
              onDelete={() => onDeleteLine(block.lineIndex)}
            />
          </span>
        </div>
      )

    case 'paragraph':
      return (
        <p className="text-sm text-turbo-text-dim my-1">
          <EditableText
            value={block.content}
            onSave={(val) => onEditLine(block.lineIndex, val)}
            multiline
          />
        </p>
      )

    default:
      return null
  }
  })()

  return <div ref={ref}>{content}</div>
})
