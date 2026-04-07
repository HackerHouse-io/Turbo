import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { PTY_BUFFER_INTERVAL_MS, DEFAULT_COLS, DEFAULT_ROWS } from '../../shared/constants'
import { getEnhancedPath } from '../system/resolveShellPath'

export interface PtyInstance {
  id: string
  process: pty.IPty
  buffer: string
  flushTimer: ReturnType<typeof setInterval> | null
}

/**
 * PtyManager: Manages PTY process lifecycle and output buffering.
 *
 * Events:
 * - 'data'  (id: string, data: string) — buffered output at 60fps
 * - 'exit'  (id: string, code: number) — process exited
 */
export class PtyManager extends EventEmitter {
  private instances = new Map<string, PtyInstance>()

  /**
   * Spawn a new PTY process running the given command.
   */
  spawn(
    id: string,
    command: string,
    args: string[],
    options: {
      cwd?: string
      env?: Record<string, string>
      cols?: number
      rows?: number
    } = {}
  ): PtyInstance {
    const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/zsh'

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: options.cols ?? DEFAULT_COLS,
      rows: options.rows ?? DEFAULT_ROWS,
      cwd: options.cwd || process.env.HOME || '/',
      env: {
        ...process.env,
        ...options.env,
        // Override PATH after the spread so caller-provided env can't accidentally
        // strip out our enhanced PATH (Finder-launched Electron starts with a
        // minimal PATH and would otherwise miss Homebrew/npm-global/etc.)
        PATH: getEnhancedPath(),
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      } as Record<string, string>
    })

    const instance: PtyInstance = {
      id,
      process: ptyProcess,
      buffer: '',
      flushTimer: null
    }

    // Buffer output and flush at 60fps for IPC efficiency
    ptyProcess.onData((data: string) => {
      instance.buffer += data

      if (!instance.flushTimer) {
        instance.flushTimer = setInterval(() => {
          if (instance.buffer.length > 0) {
            this.emit('data', id, instance.buffer)
            instance.buffer = ''
          }
        }, PTY_BUFFER_INTERVAL_MS)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.cleanup(id)
      this.emit('exit', id, exitCode)
    })

    this.instances.set(id, instance)
    return instance
  }

  /**
   * Write data to a PTY's stdin.
   */
  write(id: string, data: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.process.write(data)
    }
  }

  /**
   * Resize a PTY.
   */
  resize(id: string, cols: number, rows: number): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.process.resize(cols, rows)
    }
  }

  /**
   * Kill a PTY process.
   */
  kill(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.process.kill()
      this.cleanup(id)
    }
  }

  /**
   * Kill all PTY processes.
   */
  killAll(): void {
    for (const id of this.instances.keys()) {
      this.kill(id)
    }
  }

  private cleanup(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      if (instance.flushTimer) {
        clearInterval(instance.flushTimer)
        instance.flushTimer = null
      }
      // Flush remaining buffer
      if (instance.buffer.length > 0) {
        this.emit('data', id, instance.buffer)
        instance.buffer = ''
      }
      this.instances.delete(id)
    }
  }
}
