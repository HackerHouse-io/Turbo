import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import { PtyManager } from '../pty/PtyManager'
import type { PlainTerminal, PlainTerminalType } from '../../shared/types'

/**
 * PlainTerminalManager: Manages plain shell and claude terminals (not tied to Claude sessions).
 *
 * Events:
 * - 'terminal-data' (id: string, data: string) — buffered output
 * - 'terminal-exit' (id: string, code: number) — process exited
 * - 'terminal-created' (terminal: PlainTerminal) — new terminal registered
 * - 'terminal-removed' (terminalId: string) — terminal removed (killed or exited)
 */
export class PlainTerminalManager extends EventEmitter {
  private pty = new PtyManager()
  private terminals = new Map<string, PlainTerminal>()
  /** Tracks which terminals have had their PTY spawned (lazy spawn on first resize) */
  private spawned = new Set<string>()
  /** Pending env vars for terminals that haven't been spawned yet (e.g. claude git env) */
  private pendingEnv = new Map<string, Record<string, string>>()
  /** Queued stdin for terminals whose PTY hasn't spawned yet */
  private pendingInput = new Map<string, string>()

  constructor() {
    super()

    this.pty.on('data', (id: string, data: string) => {
      this.emit('terminal-data', id, data)
    })

    this.pty.on('exit', (id: string, code: number) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        this.terminals.delete(id)
        this.emit('terminal-removed', id)
      }
      this.spawned.delete(id)
      this.pendingEnv.delete(id)
      this.pendingInput.delete(id)
      this.emit('terminal-exit', id, code)
    })
  }

  /**
   * Create a plain terminal for the given project path.
   * No one-per-project constraint — multiple terminals per project allowed (max 4 enforced by caller).
   */
  create(projectPath: string, type: PlainTerminalType, env?: Record<string, string>): PlainTerminal {
    const id = `plain-${uuid()}`
    const shell = type === 'claude' ? 'claude' : (process.env.SHELL || '/bin/zsh')

    const terminal: PlainTerminal = {
      id,
      type,
      projectPath,
      shell,
      createdAt: Date.now()
    }

    this.terminals.set(id, terminal)

    if (env) {
      this.pendingEnv.set(id, env)
    }

    this.emit('terminal-created', terminal)
    return terminal
  }

  write(id: string, data: string): void {
    if (!this.spawned.has(id)) {
      // Queue input until PTY spawns on first resize
      const queued = this.pendingInput.get(id) || ''
      this.pendingInput.set(id, queued + data)
      return
    }
    this.pty.write(id, data)
  }

  resize(id: string, cols: number, rows: number): void {
    if (!this.spawned.has(id)) {
      // First resize — spawn PTY at the correct dimensions
      const terminal = this.terminals.get(id)
      if (terminal) {
        const env = this.pendingEnv.get(id)
        // PtyManager merges process.env + enhanced PATH internally — only
        // pass extra vars here, not the whole environment.
        this.pty.spawn(id, terminal.shell, [], {
          cwd: terminal.projectPath,
          cols,
          rows,
          ...(env ? { env } : {})
        })
        this.spawned.add(id)
        this.pendingEnv.delete(id)

        // Flush any input that arrived before the PTY was ready
        const queued = this.pendingInput.get(id)
        if (queued) {
          this.pty.write(id, queued)
          this.pendingInput.delete(id)
        }
      }
      return
    }
    this.pty.resize(id, cols, rows)
  }

  kill(id: string): void {
    const terminal = this.terminals.get(id)
    if (terminal) {
      this.terminals.delete(id)
      this.emit('terminal-removed', id)
    }
    this.spawned.delete(id)
    this.pendingEnv.delete(id)
    this.pendingInput.delete(id)
    this.pty.kill(id)
  }

  list(): PlainTerminal[] {
    return Array.from(this.terminals.values())
  }

  countByProject(projectPath: string): number {
    let count = 0
    for (const t of this.terminals.values()) {
      if (t.projectPath === projectPath) count++
    }
    return count
  }

  dispose(): void {
    this.pty.killAll()
    this.terminals.clear()
    this.spawned.clear()
    this.pendingEnv.clear()
    this.pendingInput.clear()
  }
}
