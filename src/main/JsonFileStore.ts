import { readFileSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'

/**
 * Simple JSON file persistence. Handles read/write with silent error handling.
 */
export class JsonFileStore<T> {
  constructor(private filePath: string) {}

  read(fallback: T): T {
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf-8'))
    } catch {
      return fallback
    }
  }

  write(data: T): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(data))
    } catch {
      // Non-fatal — best effort persistence
    }
  }

  async writeAsync(data: T): Promise<void> {
    try {
      await writeFile(this.filePath, JSON.stringify(data))
    } catch {
      // Non-fatal — best effort persistence
    }
  }
}
