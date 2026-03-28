import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import { PtyManager } from '../pty/PtyManager'
import { OutputMonitor } from './OutputMonitor'
import type {
  AgentSession,
  AgentStatus,
  CreateSessionPayload,
  AttentionItem,
  ActivityBlock
} from '../../shared/types'
import { COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN } from '../../shared/constants'

/**
 * ClaudeSessionManager: Core orchestrator for Claude Code CLI sessions.
 *
 * Manages spawning, tracking, and lifecycle of multiple concurrent
 * Claude Code agents. Each agent runs in its own PTY with an
 * OutputMonitor parsing structured state.
 *
 * Events:
 * - 'session-updated'  (session: AgentSession)
 * - 'terminal-data'    (sessionId: string, data: string)
 * - 'attention-needed' (item: AttentionItem)
 * - 'session-removed'  (sessionId: string)
 */
export class ClaudeSessionManager extends EventEmitter {
  private sessions = new Map<string, AgentSession>()
  private monitors = new Map<string, OutputMonitor>()
  private ptyManager: PtyManager

  constructor() {
    super()
    this.ptyManager = new PtyManager()
    this.setupPtyListeners()
  }

  /**
   * Create and start a new Claude Code agent session.
   */
  async createSession(payload: CreateSessionPayload): Promise<AgentSession> {
    const id = uuid()
    const name = payload.name || this.generateName(payload.prompt)

    const session: AgentSession = {
      id,
      name,
      projectId: 'default',
      projectPath: payload.projectPath,
      status: 'starting',
      prompt: payload.prompt,
      startedAt: Date.now(),
      tokenCount: 0,
      estimatedCost: 0,
      activityBlocks: [],
      lastActivity: 'Starting agent...',
      needsAttention: false
    }

    this.sessions.set(id, session)

    // Set up output monitor for this session
    const monitor = new OutputMonitor()
    this.monitors.set(id, monitor)

    monitor.onStatusChange = (status: AgentStatus, message?: string) => {
      this.updateSessionStatus(id, status, message)
    }

    monitor.onBlockCreated = (block: ActivityBlock) => {
      const s = this.sessions.get(id)
      if (s) {
        s.activityBlocks.push(block)
        s.lastActivity = block.title
        s.currentAction = block.title + (block.content ? ': ' + block.content.slice(0, 60) : '')
        this.emitUpdate(id)
      }
    }

    monitor.onBlockUpdated = (block: ActivityBlock) => {
      const s = this.sessions.get(id)
      if (s) {
        const idx = s.activityBlocks.findIndex(b => b.id === block.id)
        if (idx >= 0) {
          s.activityBlocks[idx] = block
          s.currentAction = block.title + (block.content ? ': ' + block.content.slice(0, 60) : '')
          this.emitUpdate(id)
        }
      }
    }

    monitor.onAttentionNeeded = (type, message) => {
      const s = this.sessions.get(id)
      if (s) {
        s.needsAttention = true
        s.attentionMessage = message
        s.attentionType = type
        this.emitUpdate(id)

        const item: AttentionItem = {
          id: uuid(),
          sessionId: id,
          type,
          title: s.name,
          message,
          timestamp: Date.now(),
          dismissed: false
        }
        this.emit('attention-needed', item)
      }
    }

    // Build the command args
    const args = this.buildClaudeArgs(payload)

    // Spawn PTY
    this.ptyManager.spawn(id, 'claude', args, {
      cwd: payload.projectPath,
      env: this.buildEnv()
    })

    this.emitUpdate(id)
    return session
  }

  /**
   * Stop (kill) a session.
   */
  stopSession(sessionId: string): void {
    this.ptyManager.kill(sessionId)
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'stopped'
      session.completedAt = Date.now()
      this.emitUpdate(sessionId)
    }
  }

  /**
   * Send text input to a session's PTY.
   */
  writeToSession(sessionId: string, data: string): void {
    this.ptyManager.write(sessionId, data)
    // Clear attention flag when user responds
    const session = this.sessions.get(sessionId)
    if (session && session.needsAttention) {
      session.needsAttention = false
      session.attentionMessage = undefined
      session.attentionType = undefined
      this.emitUpdate(sessionId)
    }
  }

  /**
   * Resize a session's terminal.
   */
  resizeSession(sessionId: string, cols: number, rows: number): void {
    this.ptyManager.resize(sessionId, cols, rows)
  }

  /**
   * Get all sessions as array.
   */
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get a single session.
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Remove a completed/stopped session from tracking.
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.monitors.delete(sessionId)
    this.emit('session-removed', sessionId)
  }

  /**
   * Clean up all sessions on app quit.
   */
  dispose(): void {
    this.ptyManager.killAll()
    this.sessions.clear()
    this.monitors.clear()
  }

  // ─── Private ────────────────────────────────────────────────

  private setupPtyListeners(): void {
    this.ptyManager.on('data', (id: string, data: string) => {
      // Forward raw data to renderer for xterm.js
      this.emit('terminal-data', id, data)

      // Feed to output monitor for structured analysis
      const monitor = this.monitors.get(id)
      if (monitor) {
        monitor.feed(data)
      }

      // Update rough token estimate
      const session = this.sessions.get(id)
      if (session) {
        // Very rough: ~4 chars per token
        session.tokenCount += Math.ceil(data.length / 4)
        session.estimatedCost =
          session.tokenCount * (COST_PER_INPUT_TOKEN + COST_PER_OUTPUT_TOKEN) / 2
      }
    })

    this.ptyManager.on('exit', (id: string, code: number) => {
      const monitor = this.monitors.get(id)
      if (monitor) {
        monitor.notifyExit(code)
      }

      const session = this.sessions.get(id)
      if (session) {
        session.completedAt = Date.now()
      }
    })
  }

  private buildClaudeArgs(payload: CreateSessionPayload): string[] {
    const args: string[] = []

    if (payload.permissionMode && payload.permissionMode !== 'default') {
      args.push('--permission-mode', payload.permissionMode)
    }

    if (payload.effort) {
      args.push('--effort', payload.effort)
    }

    // Prompt is a positional argument in Claude CLI (must come last)
    if (payload.prompt) {
      args.push(payload.prompt)
    }

    return args
  }

  private buildEnv(): Record<string, string> {
    return {
      // Ensure Claude Code uses non-interactive terminal features appropriately
      TURBO_MANAGED: '1'
    }
  }

  private updateSessionStatus(id: string, status: AgentStatus, _message?: string): void {
    const session = this.sessions.get(id)
    if (!session) return

    session.status = status
    if (status === 'completed' || status === 'error' || status === 'stopped') {
      session.completedAt = Date.now()
    }

    this.emitUpdate(id)
  }

  private emitUpdate(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.emit('session-updated', { ...session })
    }
  }

  private generateName(prompt?: string): string {
    if (!prompt) return 'New Task'
    // Take first ~40 chars of prompt as name
    const clean = prompt.replace(/\s+/g, ' ').trim()
    if (clean.length <= 40) return clean
    return clean.slice(0, 37) + '...'
  }
}
