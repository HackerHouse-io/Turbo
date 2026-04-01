import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { homedir } from 'os'
import type { TurboSettings } from '../shared/types'
import { JsonFileStore } from './JsonFileStore'

export class SettingsManager {
  private store: JsonFileStore<TurboSettings>
  private settings: TurboSettings

  constructor() {
    this.store = new JsonFileStore(join(app.getPath('userData'), 'settings.json'))
    this.settings = this.store.read({ defaultProjectsDir: this.detectDefaultDir() })
  }

  private save(): void {
    this.store.write(this.settings)
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
