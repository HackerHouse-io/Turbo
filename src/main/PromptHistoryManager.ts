import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { PromptHistoryItem } from '../shared/types'
import { PROMPT_HISTORY_MAX } from '../shared/constants'

/**
 * PromptHistoryManager: Prompt history persistence.
 * On construction, deletes legacy prompt-templates.json if present.
 */
export class PromptHistoryManager {
  private history: PromptHistoryItem[] = []
  private historyPath: string

  constructor(userDataPath: string) {
    this.historyPath = join(userDataPath, 'prompt-history.json')

    // Clean up legacy template file
    try { unlinkSync(join(userDataPath, 'prompt-templates.json')) } catch { /* Non-fatal */ }

    this.load()
  }

  // ─── History ───────────────────────────────────────────────

  listHistory(): PromptHistoryItem[] {
    return this.history
  }

  addHistory(prompt: string, projectPath: string): void {
    // Dedupe by prompt text — remove existing match
    this.history = this.history.filter(h => h.prompt !== prompt)

    // Add at front
    this.history.unshift({
      id: uuid(),
      prompt,
      projectPath,
      timestamp: Date.now()
    })

    // Cap at max
    if (this.history.length > PROMPT_HISTORY_MAX) {
      this.history = this.history.slice(0, PROMPT_HISTORY_MAX)
    }

    this.saveHistory()
  }

  clearHistory(): void {
    this.history = []
    this.saveHistory()
  }

  // ─── Private ───────────────────────────────────────────────

  private load(): void {
    try {
      const raw = readFileSync(this.historyPath, 'utf-8')
      this.history = JSON.parse(raw)
    } catch {
      // File missing or corrupt — start fresh
    }
  }

  private saveHistory(): void {
    try {
      writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
