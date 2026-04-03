import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, appendFileSync } from 'fs'
import { readFile, writeFile, appendFile } from 'fs/promises'

const MAX_BUFFER_SIZE = 512 * 1024 // 512 KB per session
const FLUSH_INTERVAL_MS = 5000     // 5 seconds

/**
 * TerminalBufferStore: Persists raw PTY output per session to disk
 * so that XTermRenderer can replay it after app restart.
 *
 * Files are stored as `terminal-buffers/<sessionId>.buf` under userData.
 * Each file is raw UTF-8 (including ANSI escape codes) capped at 512KB.
 */
export class TerminalBufferStore {
  private dir: string
  private pending = new Map<string, string[]>()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(userDataPath: string) {
    this.dir = join(userDataPath, 'terminal-buffers')
    mkdirSync(this.dir, { recursive: true })
  }

  /**
   * Append PTY data for a session. Buffers chunks in memory and
   * debounces writes to disk every FLUSH_INTERVAL_MS.
   */
  append(sessionId: string, data: string): void {
    let chunks = this.pending.get(sessionId)
    if (!chunks) {
      chunks = []
      this.pending.set(sessionId, chunks)
    }
    chunks.push(data)

    if (!this.timers.has(sessionId)) {
      this.timers.set(sessionId, setTimeout(() => {
        this.timers.delete(sessionId)
        this.flushAsync(sessionId)
      }, FLUSH_INTERVAL_MS))
    }
  }

  /**
   * Read persisted buffer from disk. Returns null if no file exists.
   */
  read(sessionId: string): string | null {
    try {
      return readFileSync(this.filePath(sessionId), 'utf-8')
    } catch {
      return null
    }
  }

  /**
   * Delete the buffer file for a session.
   */
  remove(sessionId: string): void {
    this.pending.delete(sessionId)
    const timer = this.timers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(sessionId)
    }
    try {
      unlinkSync(this.filePath(sessionId))
    } catch {
      // File may not exist
    }
  }

  /**
   * Immediately flush pending data to disk (sync) for one session.
   */
  flush(sessionId: string): void {
    const timer = this.timers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(sessionId)
    }

    const chunks = this.pending.get(sessionId)
    if (!chunks || chunks.length === 0) return
    this.pending.delete(sessionId)

    const pendingData = chunks.join('')
    const filePath = this.filePath(sessionId)
    try {
      const fileSize = this.getFileSize(filePath)
      if (fileSize + pendingData.length <= MAX_BUFFER_SIZE) {
        appendFileSync(filePath, pendingData, 'utf-8')
      } else {
        let existing = ''
        try { existing = readFileSync(filePath, 'utf-8') } catch { /* no existing file */ }
        const combined = this.capToSize(existing + pendingData)
        writeFileSync(filePath, combined, 'utf-8')
      }
    } catch {
      // Write failure — non-fatal
    }
  }

  /**
   * Flush all pending data synchronously. Called on app quit.
   */
  flushAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()

    for (const sessionId of this.pending.keys()) {
      this.flush(sessionId)
    }
  }

  /**
   * Remove buffer files for sessions that no longer exist.
   */
  pruneOrphans(validSessionIds: Set<string>): void {
    try {
      const files = readdirSync(this.dir)
      for (const file of files) {
        if (!file.endsWith('.buf')) continue
        const sessionId = file.slice(0, -4)
        if (!validSessionIds.has(sessionId)) {
          try { unlinkSync(join(this.dir, file)) } catch { /* ignore */ }
        }
      }
    } catch {
      // Directory read failure — non-fatal
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private filePath(sessionId: string): string {
    return join(this.dir, `${sessionId}.buf`)
  }

  private getFileSize(filePath: string): number {
    try { return statSync(filePath).size } catch { return 0 }
  }

  private capToSize(data: string): string {
    if (data.length <= MAX_BUFFER_SIZE) return data
    return data.slice(data.length - MAX_BUFFER_SIZE)
  }

  private async flushAsync(sessionId: string): Promise<void> {
    const chunks = this.pending.get(sessionId)
    if (!chunks || chunks.length === 0) return
    this.pending.delete(sessionId)

    const pendingData = chunks.join('')
    const filePath = this.filePath(sessionId)
    try {
      const fileSize = this.getFileSize(filePath)
      if (fileSize + pendingData.length <= MAX_BUFFER_SIZE) {
        await appendFile(filePath, pendingData, 'utf-8')
      } else {
        let existing = ''
        try { existing = await readFile(filePath, 'utf-8') } catch { /* no existing file */ }
        const combined = this.capToSize(existing + pendingData)
        await writeFile(filePath, combined, 'utf-8')
      }
    } catch {
      // Write failure — non-fatal
    }
  }
}
