import { EventEmitter } from 'events'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { v4 as uuid } from 'uuid'
import { PtyManager } from '../pty/PtyManager'
import { OutputMonitor } from './OutputMonitor'
import { TerminalBufferStore } from './TerminalBufferStore'
import { JsonFileStore } from '../JsonFileStore'
import type {
  AgentSession,
  AgentStatus,
  CreateSessionPayload,
  AttentionItem,
  ActivityBlock
} from '../../shared/types'
import { isTerminalStatus } from '../../shared/types'
import { COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN, SESSION_HISTORY_MAX, MAX_ACTIVITY_BLOCKS, MAX_PERSISTED_BLOCKS } from '../../shared/constants'
import { GitIdentityManager } from '../git/GitIdentityManager'
import type { GitOpsManager } from '../git/GitOpsManager'
import type { SettingsManager } from '../SettingsManager'
import type { ProjectManager } from '../ProjectManager'
import type { GitIdentity } from '../../shared/types'

const execFileAsync = promisify(execFile)

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
  private gitSnapshots = new Map<string, { headSha: string; dirtyFiles: Set<string> }>()
  private ptyManager: PtyManager
  private settingsManager: SettingsManager
  private projectManager: ProjectManager
  private gitOpsManager: GitOpsManager
  private gitIdentity: GitIdentityManager
  private store: JsonFileStore<AgentSession[]>
  private bufferStore: TerminalBufferStore
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private savePending = false
  private lastDimensions = new Map<string, { cols: number; rows: number }>()
  private blockUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private titleAbortControllers = new Map<string, AbortController>()

  constructor(settingsManager: SettingsManager, projectManager: ProjectManager, gitOpsManager: GitOpsManager, userDataPath: string) {
    super()
    this.settingsManager = settingsManager
    this.projectManager = projectManager
    this.gitOpsManager = gitOpsManager
    this.gitIdentity = new GitIdentityManager()
    this.ptyManager = new PtyManager()
    this.store = new JsonFileStore(join(userDataPath, 'session-history.json'))
    this.bufferStore = new TerminalBufferStore(userDataPath)
    this.setupPtyListeners()
    this.load()
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

    this.wireMonitor(id)

    // Build the command args and env (env is async — resolves git identity)
    const args = this.buildClaudeArgs(payload, id)
    const env = await this.buildEnv(payload.projectPath)

    // Capture git baseline before spawning
    this.captureGitSnapshot(id, payload.projectPath)

    // Spawn PTY
    this.ptyManager.spawn(id, 'claude', args, {
      cwd: payload.projectPath,
      env
    })

    // Fire async AI title generation (non-blocking)
    if (!payload.name && payload.prompt) {
      this.generateSmartTitle(id, payload.prompt)
    }

    this.emitUpdate(id)
    return session
  }

  /**
   * Stop (kill) a session.
   */
  async stopSession(sessionId: string): Promise<void> {
    this.abortTitleGeneration(sessionId)
    this.ptyManager.kill(sessionId)
    this.bufferStore.flush(sessionId)
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'stopped'
      session.completedAt = Date.now()
      session.touchedFiles = await this.computeTouchedFiles(sessionId, session.projectPath)
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
    this.lastDimensions.set(sessionId, { cols, rows })
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
    this.abortTitleGeneration(sessionId)
    this.sessions.delete(sessionId)
    this.monitors.delete(sessionId)
    this.gitSnapshots.delete(sessionId)
    this.lastDimensions.delete(sessionId)
    this.bufferStore.remove(sessionId)
    const timer = this.blockUpdateTimers.get(sessionId)
    if (timer) { clearTimeout(timer); this.blockUpdateTimers.delete(sessionId) }
    this.saveNow()
    this.emit('session-removed', sessionId)
  }

  /**
   * Read persisted terminal buffer from disk for a session.
   */
  readTerminalBuffer(sessionId: string): string | null {
    return this.bufferStore.read(sessionId)
  }

  /**
   * Resume a completed/stopped session using Claude CLI --resume.
   */
  async resumeSession(sessionId: string): Promise<AgentSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session || !isTerminalStatus(session.status)) return null

    // Reset session state
    session.status = 'starting'
    session.completedAt = undefined
    session.touchedFiles = undefined
    session.needsAttention = false
    session.attentionMessage = undefined
    session.attentionType = undefined
    session.currentAction = undefined
    session.lastActivity = 'Resuming agent...'

    this.wireMonitor(sessionId)

    // Clear old terminal data before spawning new PTY
    this.bufferStore.remove(sessionId)
    this.emit('terminal-clear', sessionId)

    const env = await this.buildEnv(session.projectPath)

    // Capture git baseline
    this.captureGitSnapshot(sessionId, session.projectPath)

    // Spawn PTY with --resume, using last-known terminal dimensions
    const dims = this.lastDimensions.get(sessionId)
    this.ptyManager.spawn(sessionId, 'claude', ['--resume', sessionId], {
      cwd: session.projectPath,
      env,
      ...(dims && { cols: dims.cols, rows: dims.rows })
    })

    this.emitUpdate(sessionId)
    return session
  }

  /**
   * Clean up all sessions on app quit.
   */
  dispose(): void {
    // Mark all non-terminal sessions as stopped before killing PTYs
    for (const session of this.sessions.values()) {
      if (!isTerminalStatus(session.status)) {
        session.status = 'stopped'
        session.completedAt = Date.now()
      }
    }
    this.saveNow()
    this.bufferStore.flushAll()

    this.ptyManager.killAll()
    this.monitors.clear()
    this.gitSnapshots.clear()
    this.lastDimensions.clear()
    this.blockUpdateTimers.forEach(t => clearTimeout(t))
    this.blockUpdateTimers.clear()
    this.titleAbortControllers.forEach(ac => ac.abort())
    this.titleAbortControllers.clear()
  }

  // ─── Persistence ────────────────────────────────────────────

  private load(): void {
    const sessions = this.store.read([])

    for (const session of sessions) {
      if (!isTerminalStatus(session.status)) {
        session.status = 'stopped'
        session.completedAt = session.completedAt || Date.now()
      }
      // Clear live-only fields
      session.needsAttention = false
      session.attentionMessage = undefined
      session.attentionType = undefined
      session.currentAction = undefined

      this.sessions.set(session.id, session)
    }

    this.enforceHistoryCap()
    this.bufferStore.pruneOrphans(new Set(this.sessions.keys()))
  }

  /** Debounced save — batches rapid mutations into a single async write */
  private save(): void {
    if (this.savePending) return
    this.savePending = true
    this.saveTimer = setTimeout(() => {
      this.savePending = false
      this.saveTimer = null
      this.enforceHistoryCap()
      this.store.writeAsync(this.serializeSessions())
    }, 2000)
  }

  /** Immediate sync save — used for dispose and removeSession */
  private saveNow(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
      this.savePending = false
    }
    this.enforceHistoryCap()
    this.store.write(this.serializeSessions())
  }

  private serializeSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).map(s => {
      const { currentAction, needsAttention, attentionMessage, attentionType, ...rest } = s
      // Trim activity blocks for persistence to keep file size manageable
      if (rest.activityBlocks.length > MAX_PERSISTED_BLOCKS) {
        rest.activityBlocks = rest.activityBlocks.slice(-MAX_PERSISTED_BLOCKS)
      }
      return rest as AgentSession
    })
  }

  private enforceHistoryCap(): void {
    if (this.sessions.size <= SESSION_HISTORY_MAX) return
    const completed = Array.from(this.sessions.values())
      .filter(s => isTerminalStatus(s.status))
      .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))

    let toRemove = this.sessions.size - SESSION_HISTORY_MAX
    for (const session of completed) {
      if (toRemove <= 0) break
      this.sessions.delete(session.id)
      this.bufferStore.remove(session.id)
      toRemove--
    }
  }

  // ─── Private ────────────────────────────────────────────────

  private wireMonitor(sessionId: string): void {
    const monitor = new OutputMonitor()
    this.monitors.set(sessionId, monitor)

    monitor.onStatusChange = (status: AgentStatus, message?: string) => {
      this.updateSessionStatus(sessionId, status, message)
    }

    monitor.onBlockCreated = (block: ActivityBlock) => {
      const s = this.sessions.get(sessionId)
      if (s) {
        s.activityBlocks.push(block)
        if (s.activityBlocks.length > MAX_ACTIVITY_BLOCKS) {
          s.activityBlocks = s.activityBlocks.slice(-MAX_ACTIVITY_BLOCKS)
        }
        s.lastActivity = block.title
        s.currentAction = block.title + (block.content ? ': ' + block.content.slice(0, 60) : '')
        this.emitUpdate(sessionId)
      }
    }

    monitor.onBlockUpdated = (block: ActivityBlock) => {
      const s = this.sessions.get(sessionId)
      if (s) {
        const idx = s.activityBlocks.findIndex(b => b.id === block.id)
        if (idx >= 0) {
          s.activityBlocks[idx] = block
          s.currentAction = block.title + (block.content ? ': ' + block.content.slice(0, 60) : '')
          if (!this.blockUpdateTimers.has(sessionId)) {
            this.blockUpdateTimers.set(sessionId, setTimeout(() => {
              this.blockUpdateTimers.delete(sessionId)
              this.emitUpdate(sessionId)
            }, 200))
          }
        }
      }
    }

    monitor.onAttentionNeeded = (type, message) => {
      const s = this.sessions.get(sessionId)
      if (!s || s.status === 'stopped') return
      if (type === 'stuck' && isTerminalStatus(s.status)) return

      s.needsAttention = true
      s.attentionMessage = message
      s.attentionType = type
      this.emitUpdate(sessionId)

      const item: AttentionItem = {
        id: uuid(),
        sessionId,
        type,
        title: s.name,
        message,
        timestamp: Date.now(),
        dismissed: false,
        read: false
      }
      this.emit('attention-needed', item)
    }
  }

  private setupPtyListeners(): void {
    this.ptyManager.on('data', (id: string, data: string) => {
      // Forward raw data to renderer for xterm.js
      this.emit('terminal-data', id, data)

      // Persist raw output to disk for replay after restart
      this.bufferStore.append(id, data)

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
      this.bufferStore.flush(id)
      const session = this.sessions.get(id)
      // Skip monitor notification if session was manually stopped
      if (session?.status !== 'stopped') {
        const monitor = this.monitors.get(id)
        if (monitor) {
          monitor.notifyExit(code)
        }
      }

      if (session && !session.completedAt) {
        session.completedAt = Date.now()
      }

      // Compute touched files from git diff
      if (session) {
        this.computeTouchedFiles(id, session.projectPath).then(files => {
          session.touchedFiles = files
          this.emitUpdate(id)
        })
      }
    })
  }

  private async captureGitSnapshot(sessionId: string, projectPath: string): Promise<void> {
    try {
      const [statusResult, headResult] = await Promise.all([
        this.gitOpsManager.getStatus(projectPath),
        this.gitOpsManager.exec(projectPath, 'git', ['rev-parse', 'HEAD'])
      ])
      if (!headResult.success) return // not a git repo
      const headSha = headResult.stdout.trim()
      const dirtyFiles = new Set<string>()
      for (const line of statusResult.stdout.split('\n')) {
        // Porcelain format: XY filename (or XY old -> new for renames)
        const file = line.slice(3).split(' -> ').pop()?.trim()
        if (file) dirtyFiles.add(file)
      }
      this.gitSnapshots.set(sessionId, { headSha, dirtyFiles })
    } catch {
      // Not a git repo or git not available — skip
    }
  }

  private async computeTouchedFiles(sessionId: string, projectPath: string): Promise<string[]> {
    const snapshot = this.gitSnapshots.get(sessionId)
    if (!snapshot) return []
    try {
      const touched = new Set<string>()

      // 1. Current dirty files NOT in start snapshot → new modifications
      const statusResult = await this.gitOpsManager.getStatus(projectPath)
      if (statusResult.success) {
        for (const line of statusResult.stdout.split('\n')) {
          const file = line.slice(3).split(' -> ').pop()?.trim()
          if (file && !snapshot.dirtyFiles.has(file)) {
            touched.add(file)
          }
        }
      }

      // 2. Committed changes during session: diff startSha..HEAD
      const headResult = await this.gitOpsManager.exec(projectPath, 'git', ['rev-parse', 'HEAD'])
      if (headResult.success) {
        const currentSha = headResult.stdout.trim()
        if (currentSha !== snapshot.headSha) {
          const diffResult = await this.gitOpsManager.exec(
            projectPath, 'git', ['diff', '--name-only', `${snapshot.headSha}..${currentSha}`]
          )
          if (diffResult.success) {
            for (const file of diffResult.stdout.split('\n')) {
              if (file.trim()) touched.add(file.trim())
            }
          }
        }
      }

      return Array.from(touched).sort()
    } catch {
      return []
    } finally {
      this.gitSnapshots.delete(sessionId)
    }
  }

  private buildClaudeArgs(payload: CreateSessionPayload, sessionId: string): string[] {
    const args: string[] = []

    // Tie Claude CLI session ID to Turbo session ID for resume support
    // Skip when resuming — the resumed session already has an ID
    if (!payload.resumeSessionId) {
      args.push('--session-id', sessionId)
    }

    if (payload.model) {
      args.push('--model', payload.model)
    }

    if (payload.print) {
      args.push('-p')
    }

    if (payload.resumeSessionId) {
      args.push('--resume', payload.resumeSessionId)
    }

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

  private async buildEnv(projectPath: string): Promise<Record<string, string>> {
    const env: Record<string, string> = {
      TURBO_MANAGED: '1'
    }
    const project = this.projectManager.getProjectByPath(projectPath)
    const globalOverride = this.settingsManager.get('gitIdentityGlobal') as GitIdentity | undefined
    const resolved = await this.gitIdentity.resolveIdentity(
      projectPath,
      project?.gitIdentityOverride,
      globalOverride
    )
    if (resolved.identity) {
      Object.assign(env, this.gitIdentity.buildGitEnv(resolved.identity))
    }
    return env
  }

  private updateSessionStatus(id: string, status: AgentStatus, _message?: string): void {
    const session = this.sessions.get(id)
    if (!session) return

    session.status = status
    if (isTerminalStatus(status)) {
      session.completedAt = Date.now()
      // Clear stale attention (e.g., lingering 'stuck' from idle timer)
      // Fresh attention ('completed'/'error') will be set immediately after by notifyExit
      session.needsAttention = false
      session.attentionMessage = undefined
      session.attentionType = undefined
    }

    this.emitUpdate(id)
  }

  private emitUpdate(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.emit('session-updated', { ...session })
      this.save()
    }
  }

  private generateName(prompt?: string): string {
    if (!prompt) return 'New Task'
    // Take first ~40 chars of prompt as name
    const clean = prompt.replace(/\s+/g, ' ').trim()
    if (clean.length <= 40) return clean
    return clean.slice(0, 37) + '...'
  }

  private async generateSmartTitle(sessionId: string, prompt: string): Promise<void> {
    const ac = new AbortController()
    this.titleAbortControllers.set(sessionId, ac)
    try {
      const titlePrompt = `Generate a concise descriptive title (3-6 words, no quotes) for this coding task. Output ONLY the title, nothing else.\n\nTask: ${prompt}`
      const result = await execFileAsync('claude', ['-p', titlePrompt], {
        timeout: 30_000,
        maxBuffer: 256 * 1024,
        signal: ac.signal
      })
      const cleaned = result.stdout.trim().replace(/^["'`]|["'`]$/g, '')
      const session = this.sessions.get(sessionId)
      if (session && cleaned) {
        session.name = cleaned
        this.emitUpdate(sessionId)
      }
    } catch {
      // Silently keep truncated prompt as fallback
    } finally {
      this.titleAbortControllers.delete(sessionId)
    }
  }

  private abortTitleGeneration(sessionId: string): void {
    const ac = this.titleAbortControllers.get(sessionId)
    if (ac) {
      ac.abort()
      this.titleAbortControllers.delete(sessionId)
    }
  }
}
