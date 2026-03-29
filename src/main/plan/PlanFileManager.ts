import { readFileSync, writeFileSync, statSync, watch, type FSWatcher } from 'fs'
import { join } from 'path'
import type { PlanReadResult, PlanSavePayload, PlanSaveResult } from '../../shared/types'

const SEARCH_PATHS = ['PLAN.md', 'docs/PLAN.md', 'plan.md']

export class PlanFileManager {
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private writeIgnoreUntil = 0

  readPlan(projectPath: string): PlanReadResult {
    const searchedPaths: string[] = []

    for (const rel of SEARCH_PATHS) {
      const full = join(projectPath, rel)
      searchedPaths.push(full)
      try {
        const stat = statSync(full)
        const raw = readFileSync(full, 'utf-8')
        return {
          found: true,
          filePath: full,
          raw,
          lastModified: stat.mtimeMs,
          searchedPaths
        }
      } catch {
        // Not found, continue
      }
    }

    return {
      found: false,
      filePath: null,
      raw: null,
      lastModified: 0,
      searchedPaths
    }
  }

  savePlan(payload: PlanSavePayload): PlanSaveResult {
    try {
      const stat = statSync(payload.filePath)
      if (Math.abs(stat.mtimeMs - payload.lastModified) > 50) {
        return { success: false, conflict: true, lastModified: stat.mtimeMs }
      }
    } catch {
      // File doesn't exist yet — fine, we'll create it
    }

    // Ignore watcher events from our own write
    this.writeIgnoreUntil = Date.now() + 500

    writeFileSync(payload.filePath, payload.content, 'utf-8')
    const newStat = statSync(payload.filePath)
    return { success: true, conflict: false, lastModified: newStat.mtimeMs }
  }

  watchFile(filePath: string, onChange: () => void): void {
    this.unwatchFile()

    try {
      this.watcher = watch(filePath, () => {
        // Ignore events triggered by our own writes
        if (Date.now() < this.writeIgnoreUntil) return

        // Debounce — editors fire multiple events per save
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(onChange, 300)
      })

      this.watcher.on('error', () => {
        this.unwatchFile()
      })
    } catch {
      // File may not exist
    }
  }

  unwatchFile(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  dispose(): void {
    this.unwatchFile()
  }
}
