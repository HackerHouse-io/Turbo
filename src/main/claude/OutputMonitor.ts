import { v4 as uuid } from 'uuid'
import type { ActivityBlock, ActivityBlockType, AgentStatus } from '../../shared/types'

// Strip ANSI escape codes for pattern matching
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '')
}

// ─── Pattern definitions ──────────────────────────────────────

const TOOL_PATTERNS: Array<{ pattern: RegExp; type: ActivityBlockType; label: string }> = [
  { pattern: /^\s*◆?\s*Read\b/i, type: 'read', label: 'Reading files' },
  { pattern: /^\s*◆?\s*Edit\b/i, type: 'edit', label: 'Editing' },
  { pattern: /^\s*◆?\s*Write\b/i, type: 'write', label: 'Writing file' },
  { pattern: /^\s*◆?\s*Bash\b/i, type: 'bash', label: 'Running command' },
  { pattern: /^\s*◆?\s*Grep\b/i, type: 'search', label: 'Searching' },
  { pattern: /^\s*◆?\s*Glob\b/i, type: 'search', label: 'Finding files' },
  { pattern: /^\s*◆?\s*Agent\b/i, type: 'tool', label: 'Spawning agent' },
  { pattern: /^\s*◆?\s*Skill\b/i, type: 'tool', label: 'Using skill' },
  { pattern: /^\s*◆?\s*(TodoRead|TodoWrite|TaskCreate|TaskUpdate)\b/i, type: 'tool', label: 'Managing tasks' },
]

const WAITING_PATTERNS = [
  /^>\s*$/,                        // bare prompt
  /^\s*❯\s*$/,                     // alternate prompt
  /\?\s*(\(y\/n\)|\[Y\/n\])/i,    // yes/no prompt
  /Allow\s.*\?/i,                  // permission prompt
  /\(yes\/no\)/i,
]

const THINKING_PATTERNS = [
  /thinking/i,
  /◐|◑|◒|◓/,                     // spinner chars
  /\.\.\.\s*$/,                    // trailing dots
]

const QUESTION_PATTERNS = [
  /should I/i,
  /would you like/i,
  /do you want/i,
  /please (choose|select|pick)/i,
  /which (one|option)/i,
  /\?\s*\n\s*[A-D]\)/,           // multiple choice
]

/**
 * OutputMonitor: Parses PTY output from Claude Code CLI into
 * structured ActivityBlocks and detects agent status changes.
 *
 * Designed to be per-session — each agent gets its own monitor.
 */
export class OutputMonitor {
  private currentBlock: ActivityBlock | null = null
  private blocks: ActivityBlock[] = []
  private lineBuffer = ''
  private status: AgentStatus = 'starting'
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private lastOutputTime = Date.now()

  // Callbacks
  onStatusChange?: (status: AgentStatus, message?: string) => void
  onBlockCreated?: (block: ActivityBlock) => void
  onBlockUpdated?: (block: ActivityBlock) => void
  onAttentionNeeded?: (type: 'decision' | 'stuck' | 'error', message: string) => void

  constructor() {}

  /**
   * Feed raw PTY data to the monitor. Call this with every chunk
   * from the PTY output.
   */
  feed(rawData: string): void {
    this.lastOutputTime = Date.now()
    this.resetIdleTimer()

    const clean = stripAnsi(rawData)
    this.lineBuffer += clean

    // Process complete lines
    const lines = this.lineBuffer.split('\n')
    // Keep incomplete last line in buffer
    this.lineBuffer = lines.pop() || ''

    for (const line of lines) {
      this.processLine(line)
    }
  }

  /**
   * Notify the monitor that the PTY process exited.
   */
  notifyExit(code: number): void {
    this.closeCurrentBlock()
    if (this.idleTimer) clearTimeout(this.idleTimer)

    if (code === 0) {
      this.setStatus('completed')
    } else {
      this.setStatus('error')
      this.onAttentionNeeded?.('error', `Task exited with code ${code}`)
    }
  }

  getBlocks(): ActivityBlock[] {
    return [...this.blocks]
  }

  getStatus(): AgentStatus {
    return this.status
  }

  // ─── Internal ─────────────────────────────────────────────

  private processLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    // Check for tool use patterns (starts a new block)
    for (const { pattern, type, label } of TOOL_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.startBlock(type, label, this.extractDetail(trimmed))
        this.setStatus('active')
        return
      }
    }

    // Check for waiting/prompt patterns
    for (const pattern of WAITING_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.closeCurrentBlock()
        this.setStatus('waiting_for_input')
        return
      }
    }

    // Check for question patterns (needs attention)
    for (const pattern of QUESTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.onAttentionNeeded?.('decision', trimmed)
        this.setStatus('waiting_for_input')
        return
      }
    }

    // Check for thinking
    for (const pattern of THINKING_PATTERNS) {
      if (pattern.test(trimmed)) {
        if (this.status !== 'active') {
          this.setStatus('active')
        }
        return
      }
    }

    // Welcome banner detection
    if (trimmed.includes('Welcome to Claude') || trimmed.includes('Claude Code')) {
      if (this.status === 'starting') {
        this.setStatus('active')
      }
      return
    }

    // Default: append to current block or start a message block
    if (this.currentBlock) {
      this.appendToBlock(trimmed)
    } else if (trimmed.length > 5) {
      // Start a new message block for Claude's text output
      this.startBlock('message', 'Response', trimmed)
      if (this.status !== 'active') {
        this.setStatus('active')
      }
    }
  }

  private startBlock(type: ActivityBlockType, title: string, content = ''): void {
    this.closeCurrentBlock()

    const block: ActivityBlock = {
      id: uuid(),
      type,
      title,
      content,
      timestamp: Date.now(),
      collapsed: false
    }

    this.currentBlock = block
    this.blocks.push(block)
    this.onBlockCreated?.(block)
  }

  private appendToBlock(content: string): void {
    if (!this.currentBlock) return
    this.currentBlock.content += (this.currentBlock.content ? '\n' : '') + content
    this.onBlockUpdated?.(this.currentBlock)
  }

  private closeCurrentBlock(): void {
    if (this.currentBlock) {
      this.currentBlock.duration = Date.now() - this.currentBlock.timestamp
    }
    this.currentBlock = null
  }

  private setStatus(status: AgentStatus, message?: string): void {
    if (this.status === status) return
    this.status = status
    this.onStatusChange?.(status, message)
  }

  private extractDetail(line: string): string {
    // Try to extract the meaningful part after the tool name
    const match = line.match(/^\s*◆?\s*\w+\s+(.+)/)
    return match ? match[1].trim() : ''
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    // If no output for 60s while active, might be stuck
    this.idleTimer = setTimeout(() => {
      if (this.status === 'active') {
        this.onAttentionNeeded?.(
          'stuck',
          'Task has been idle for over 60 seconds'
        )
      }
    }, 60_000)
  }
}
