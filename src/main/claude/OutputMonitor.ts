import { v4 as uuid } from 'uuid'
import type { ActivityBlock, ActivityBlockType, AgentStatus } from '../../shared/types'

/**
 * Comprehensive ANSI/terminal escape stripping.
 *
 * CRITICAL: Ink (used by Claude CLI) renders via cursor positioning, not \n.
 * Phase 1 converts cursor movements to \n so we get proper line breaks.
 * Phase 2 strips everything else.
 */
function stripAnsi(str: string): string {
  return str
    // Phase 1: Convert cursor movements that imply a new line to \n
    .replace(/\x1B\[\d*(?:;\d*)?[HfABEF]/g, '\n')  // CUP, CUU, CUD, CNL, CPL
    // Phase 2: Strip remaining escape sequences
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')         // CSI sequences (\x1B[...m, etc.)
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)?/g, '')  // OSC sequences (\x1B]...BEL)
    .replace(/\x1B[()#*+][A-Z0-9]/gi, '')            // Charset designation (\x1B(B, etc.)
    .replace(/\x1B[@-_]/g, '')                         // Fe escape sequences
    .replace(/\x9B[0-?]*[ -/]*[@-~]/g, '')            // 8-bit CSI
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars (keep \t \n \r)
}

/**
 * Resolve carriage returns: when a \r appears without \n,
 * it means "overwrite from start of line" — keep only the last segment.
 */
function resolveCarriageReturns(str: string): string {
  return str.replace(/[^\n]*\r(?!\n)/g, '')
}

// ─── Pattern definitions ──────────────────────────────────────

const TOOL_PATTERNS: Array<{ pattern: RegExp; type: ActivityBlockType; label: string }> = [
  { pattern: /^\s*[◆⏺]?\s*Read\b/i, type: 'read', label: 'Reading files' },
  { pattern: /^\s*[◆⏺]?\s*Edit\b/i, type: 'edit', label: 'Editing' },
  { pattern: /^\s*[◆⏺]?\s*Write\b/i, type: 'write', label: 'Writing file' },
  { pattern: /^\s*[◆⏺]?\s*Bash\b/i, type: 'bash', label: 'Running command' },
  { pattern: /^\s*[◆⏺]?\s*Grep\b/i, type: 'search', label: 'Searching' },
  { pattern: /^\s*[◆⏺]?\s*Glob\b/i, type: 'search', label: 'Finding files' },
  { pattern: /^\s*[◆⏺]?\s*Agent\b/i, type: 'tool', label: 'Spawning agent' },
  { pattern: /^\s*[◆⏺]?\s*Skill\b/i, type: 'tool', label: 'Using skill' },
  { pattern: /^\s*[◆⏺]?\s*(TodoRead|TodoWrite|TaskCreate|TaskUpdate)\b/i, type: 'tool', label: 'Managing tasks' },
]

const WAITING_PATTERNS = [
  /^>\s*$/,                        // bare > prompt
  /^\s*❯\s*$/,                     // ❯ prompt (U+276F)
  /^\s*›\s*$/,                     // › prompt (U+203A)
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

// Lines that are purely decorative separators (box-drawing, dashes, etc.)
const SEPARATOR_RE = /^[\u2500-\u257F\u23AF\u2014\u2015\-=_~]+$/

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
  private promptDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private lastOutputTime = Date.now()
  private lastResponseLine = ''
  private hasReceivedContent = false

  // Callbacks
  onStatusChange?: (status: AgentStatus, message?: string) => void
  onBlockCreated?: (block: ActivityBlock) => void
  onBlockUpdated?: (block: ActivityBlock) => void
  onAttentionNeeded?: (type: 'decision' | 'stuck' | 'error' | 'completed', message: string) => void

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

    // Resolve carriage returns in the buffer (terminal line overwrites)
    this.lineBuffer = resolveCarriageReturns(this.lineBuffer)

    // Process complete lines
    const lines = this.lineBuffer.split('\n')
    // Keep incomplete last line in buffer
    this.lineBuffer = lines.pop() || ''

    for (const line of lines) {
      this.processLine(line)
    }

    // Track that we've received meaningful content
    const hasVisible = clean.trim().length > 0
    if (hasVisible) {
      this.hasReceivedContent = true
      this.resetPromptDetectionTimer()
    }
  }

  /**
   * Notify the monitor that the PTY process exited.
   */
  notifyExit(code: number): void {
    this.closeCurrentBlock()
    if (this.idleTimer) clearTimeout(this.idleTimer)
    if (this.promptDebounceTimer) clearTimeout(this.promptDebounceTimer)

    if (code === 0) {
      this.setStatus('completed')
      this.onAttentionNeeded?.('completed', 'Task completed successfully')
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

    // Skip decorative separator lines (────, ====, etc.)
    if (SEPARATOR_RE.test(trimmed)) return

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
      if (trimmed.length > 10) this.lastResponseLine = trimmed
    } else if (trimmed.length > 5) {
      // Start a new message block for Claude's text output
      this.startBlock('message', 'Response', trimmed)
      if (trimmed.length > 10) this.lastResponseLine = trimmed
      if (this.status === 'starting') {
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

    // Clear prompt debounce when leaving 'active' — no longer relevant
    if (status !== 'active' && this.promptDebounceTimer) {
      clearTimeout(this.promptDebounceTimer)
      this.promptDebounceTimer = null
    }

    this.onStatusChange?.(status, message)
  }

  private extractDetail(line: string): string {
    // Try to extract the meaningful part after the tool name
    const match = line.match(/^\s*[◆⏺]?\s*\w+\s+(.+)/)
    return match ? match[1].trim() : ''
  }

  /**
   * Fast prompt detection: 1.5s after visible output stops, check lineBuffer
   * for prompts that arrived without a trailing newline.
   */
  private resetPromptDetectionTimer(): void {
    if (this.promptDebounceTimer) clearTimeout(this.promptDebounceTimer)
    this.promptDebounceTimer = setTimeout(() => {
      this.checkLineBufferForPrompt()
    }, 1500)
  }

  /**
   * Extract the effective content of lineBuffer, handling \r overwrites.
   */
  private getEffectiveLineBuffer(): string {
    const segments = this.lineBuffer.split('\r')
    return (segments.pop() || '').trim()
  }

  private checkLineBufferForPrompt(): void {
    // If still 'starting' but we've received content, force transition to 'active'.
    // This catches cases where processLine() didn't trigger due to ANSI artifacts.
    if (this.status === 'starting' && this.hasReceivedContent) {
      this.setStatus('active')
    }

    if (this.status !== 'active') return

    const pending = this.getEffectiveLineBuffer()
    if (!pending) return

    for (const pattern of WAITING_PATTERNS) {
      if (pattern.test(pending)) {
        this.setStatus('waiting_for_input')
        const message = this.lastResponseLine
          ? `"${this.lastResponseLine.slice(0, 120)}"`
          : 'Claude is waiting for your input'
        this.onAttentionNeeded?.('decision', message)
        return
      }
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      // If still 'starting' after 60s with content, force to active first
      if (this.status === 'starting' && this.hasReceivedContent) {
        this.setStatus('active')
      }

      if (this.status === 'active') {
        // Last-resort lineBuffer check (prompt debounce should catch this much sooner)
        const pending = this.getEffectiveLineBuffer()
        if (pending) {
          for (const pattern of WAITING_PATTERNS) {
            if (pattern.test(pending)) {
              this.setStatus('waiting_for_input')
              const message = this.lastResponseLine
                ? `"${this.lastResponseLine.slice(0, 120)}"`
                : 'Claude is waiting for your input'
              this.onAttentionNeeded?.('decision', message)
              return
            }
          }
        }
        this.onAttentionNeeded?.(
          'stuck',
          'Task has been idle for over 60 seconds'
        )
      }
    }, 60_000)
  }
}
