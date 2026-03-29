// ─── Plan Parser ─────────────────────────────────────────────
// Pure function: raw markdown → typed AST of blocks grouped into sections.
// Runs in the renderer — no Node dependencies.

export type PlanBlockType =
  | 'heading'
  | 'checkbox'
  | 'paragraph'
  | 'code-block'
  | 'table'
  | 'blockquote'
  | 'hr'
  | 'list-item'

export interface PlanBlock {
  type: PlanBlockType
  lineIndex: number
  lineCount: number
  content: string
  level?: number
  checked?: boolean
  language?: string
  rows?: string[][]
}

export interface PlanSection {
  heading: PlanBlock
  blocks: PlanBlock[]
  totalTasks: number
  completedTasks: number
}

export interface ParsedPlan {
  sections: PlanSection[]
  preamble: PlanBlock[]
  totalTasks: number
  completedTasks: number
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const CHECKBOX_RE = /^(\s*)- \[([ xX])\]\s+(.*)$/
const FENCE_RE = /^```(\w*)$/
const TABLE_RE = /^\|(.+)\|$/
const TABLE_SEP_RE = /^\|[\s\-:|]+\|$/
const BLOCKQUOTE_RE = /^>\s?(.*)$/
const HR_RE = /^(?:---+|\*\*\*+|___+)\s*$/
const LIST_ITEM_RE = /^(\s*)- (.+)$/

export function parsePlan(raw: string): ParsedPlan {
  const lines = raw.split('\n')
  const preamble: PlanBlock[] = []
  const sections: PlanSection[] = []
  let currentSection: PlanSection | null = null
  let totalTasks = 0
  let completedTasks = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Heading
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = headingMatch[2]
      const block: PlanBlock = {
        type: 'heading',
        lineIndex: i,
        lineCount: 1,
        content,
        level
      }

      // Finalize previous section task counts
      if (currentSection) {
        currentSection.totalTasks = countTasks(currentSection.blocks, false)
        currentSection.completedTasks = countTasks(currentSection.blocks, true)
      }

      currentSection = { heading: block, blocks: [], totalTasks: 0, completedTasks: 0 }
      sections.push(currentSection)
      i++
      continue
    }

    // Fenced code block
    const fenceMatch = line.match(FENCE_RE)
    if (fenceMatch) {
      const language = fenceMatch[1] || undefined
      const startLine = i
      const contentLines: string[] = []
      i++ // skip opening fence
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        contentLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing fence
      const block: PlanBlock = {
        type: 'code-block',
        lineIndex: startLine,
        lineCount: i - startLine,
        content: contentLines.join('\n'),
        language
      }
      pushBlock(block)
      continue
    }

    // Checkbox
    const checkboxMatch = line.match(CHECKBOX_RE)
    if (checkboxMatch) {
      const indent = checkboxMatch[1].length
      const checked = checkboxMatch[2].toLowerCase() === 'x'
      const content = checkboxMatch[3]
      const block: PlanBlock = {
        type: 'checkbox',
        lineIndex: i,
        lineCount: 1,
        content,
        checked,
        level: Math.floor(indent / 2)
      }
      totalTasks++
      if (checked) completedTasks++
      pushBlock(block)
      i++
      continue
    }

    // HR
    if (HR_RE.test(line)) {
      pushBlock({ type: 'hr', lineIndex: i, lineCount: 1, content: '' })
      i++
      continue
    }

    // Table (accumulate consecutive table lines)
    if (TABLE_RE.test(line)) {
      const startLine = i
      const tableLines: string[] = []
      while (i < lines.length && (TABLE_RE.test(lines[i]) || TABLE_SEP_RE.test(lines[i]))) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .filter(l => !TABLE_SEP_RE.test(l))
        .map(l =>
          l.split('|').slice(1, -1).map(cell => cell.trim())
        )
      pushBlock({
        type: 'table',
        lineIndex: startLine,
        lineCount: i - startLine,
        content: tableLines.join('\n'),
        rows
      })
      continue
    }

    // Blockquote
    const bqMatch = line.match(BLOCKQUOTE_RE)
    if (bqMatch) {
      const startLine = i
      const bqLines: string[] = []
      while (i < lines.length) {
        const m = lines[i].match(BLOCKQUOTE_RE)
        if (!m) break
        bqLines.push(m[1])
        i++
      }
      pushBlock({
        type: 'blockquote',
        lineIndex: startLine,
        lineCount: i - startLine,
        content: bqLines.join('\n')
      })
      continue
    }

    // List item (non-checkbox)
    const listMatch = line.match(LIST_ITEM_RE)
    if (listMatch && !CHECKBOX_RE.test(line)) {
      const indent = listMatch[1].length
      pushBlock({
        type: 'list-item',
        lineIndex: i,
        lineCount: 1,
        content: listMatch[2],
        level: Math.floor(indent / 2)
      })
      i++
      continue
    }

    // Empty lines — skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph (everything else)
    pushBlock({
      type: 'paragraph',
      lineIndex: i,
      lineCount: 1,
      content: line
    })
    i++
  }

  // Finalize last section
  if (currentSection) {
    currentSection.totalTasks = countTasks(currentSection.blocks, false)
    currentSection.completedTasks = countTasks(currentSection.blocks, true)
  }

  return { sections, preamble, totalTasks, completedTasks }

  function pushBlock(block: PlanBlock) {
    if (currentSection) {
      currentSection.blocks.push(block)
    } else {
      preamble.push(block)
    }
  }
}

function countTasks(blocks: PlanBlock[], onlyCompleted: boolean): number {
  return blocks.filter(
    b => b.type === 'checkbox' && (!onlyCompleted || b.checked)
  ).length
}
