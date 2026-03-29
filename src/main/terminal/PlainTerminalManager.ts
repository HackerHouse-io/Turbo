import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import { PtyManager } from '../pty/PtyManager'
import type { PlainTerminal } from '../../shared/types'

/**
 * PlainTerminalManager: Manages plain shell terminals (not tied to Claude sessions).
 *
 * Events:
 * - 'terminal-data' (id: string, data: string) — buffered output
 * - 'terminal-exit' (id: string, code: number) — process exited
 */
export class PlainTerminalManager extends EventEmitter {
  private pty = new PtyManager()
  private terminals = new Map<string, PlainTerminal>()
  /** Reverse lookup: projectPath → terminal id (one terminal per project) */
  private byProject = new Map<string, string>()
  /** Tracks which terminals have had their PTY spawned (lazy spawn on first resize) */
  private spawned = new Set<string>()

  constructor() {
    super()

    this.pty.on('data', (id: string, data: string) => {
      this.emit('terminal-data', id, data)
    })

    this.pty.on('exit', (id: string, code: number) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        this.byProject.delete(terminal.projectPath)
        this.terminals.delete(id)
      }
      this.spawned.delete(id)
      this.emit('terminal-exit', id, code)
    })
  }

  /**
   * Create a plain shell terminal for the given project path.
   * Returns existing terminal if one is already open for that path.
   */
  create(projectPath: string): PlainTerminal {
    const existingId = this.byProject.get(projectPath)
    if (existingId) {
      const existing = this.terminals.get(existingId)
      if (existing) return existing
    }

    const id = `plain-${uuid()}`
    const shell = process.env.SHELL || '/bin/zsh'

    // Don't spawn PTY yet — wait for first resize so shell starts at correct dimensions
    const terminal: PlainTerminal = {
      id,
      projectPath,
      shell,
      createdAt: Date.now()
    }

    this.terminals.set(id, terminal)
    this.byProject.set(projectPath, id)

    return terminal
  }

  write(id: string, data: string): void {
    if (!this.spawned.has(id)) return
    this.pty.write(id, data)
  }

  resize(id: string, cols: number, rows: number): void {
    if (!this.spawned.has(id)) {
      // First resize — spawn PTY at the correct dimensions
      const terminal = this.terminals.get(id)
      if (terminal) {
        this.pty.spawn(id, terminal.shell, [], { cwd: terminal.projectPath, cols, rows })
        this.spawned.add(id)
      }
      return
    }
    this.pty.resize(id, cols, rows)
  }

  kill(id: string): void {
    const terminal = this.terminals.get(id)
    if (terminal) {
      this.byProject.delete(terminal.projectPath)
      this.terminals.delete(id)
    }
    this.spawned.delete(id)
    this.pty.kill(id)
  }

  dispose(): void {
    this.pty.killAll()
    this.terminals.clear()
    this.byProject.clear()
    this.spawned.clear()
  }
}
