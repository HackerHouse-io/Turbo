import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import type { TurboSettings } from '../shared/types'

const SETTINGS_FILE = 'settings.json'

export class SettingsManager {
  private filePath: string
  private settings: TurboSettings

  constructor() {
    this.filePath = join(app.getPath('userData'), SETTINGS_FILE)
    this.settings = this.load()
  }

  private load(): TurboSettings {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        return JSON.parse(raw) as TurboSettings
      }
    } catch {
      // Corrupted file — use defaults
    }
    return { defaultProjectsDir: this.detectDefaultDir() }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8')
  }

  private detectDefaultDir(): string {
    const home = homedir()
    const candidates = [
      join(home, 'projects'),
      join(home, 'Desktop', 'projects'),
      join(home, 'Developer'),
      join(home, 'dev')
    ]
    for (const dir of candidates) {
      if (existsSync(dir)) return dir
    }
    return home
  }

  get<K extends keyof TurboSettings>(key: K): TurboSettings[K] {
    return this.settings[key]
  }

  set<K extends keyof TurboSettings>(key: K, value: TurboSettings[K]): void {
    this.settings[key] = value
    this.save()
  }

  getAll(): TurboSettings {
    return { ...this.settings }
  }
}
