import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { GitPreset } from '../../shared/types'
import { extractTemplateVariables } from '../../shared/templateVars'

const BUILT_IN_PRESETS: Omit<GitPreset, 'id'>[] = [
  {
    name: 'Stage All',
    description: 'Stage all changes (git add -A)',
    commands: ['git add -A'],
    variables: [],
    builtIn: true,
    icon: 'git-stage'
  },
  {
    name: 'Quick Commit',
    description: 'AI-generate a commit message and commit',
    commands: [],
    variables: [],
    builtIn: true,
    icon: 'git-commit',
    flow: 'quick-commit'
  },
  {
    name: 'Push',
    description: 'Push to remote (git push)',
    commands: ['git push'],
    variables: [],
    builtIn: true,
    icon: 'git-push'
  },
  {
    name: 'Stage + Commit + Push',
    description: 'Stage all, AI commit message, then push',
    commands: [],
    variables: [],
    builtIn: true,
    icon: 'git-commit',
    flow: 'full-commit-push'
  },
  {
    name: 'Pull & Rebase',
    description: 'Pull with rebase (git pull --rebase)',
    commands: ['git pull --rebase'],
    variables: [],
    builtIn: true,
    icon: 'git-pull'
  }
]

/**
 * GitPresetManager: Preset persistence with built-in defaults.
 * Follows PromptVaultManager pattern — JSON file in userData.
 */
export class GitPresetManager {
  private presets: GitPreset[] = []
  private savePath: string

  constructor(userDataPath: string) {
    this.savePath = join(userDataPath, 'git-presets.json')
    this.load()
  }

  listPresets(): GitPreset[] {
    return this.presets
  }

  savePreset(preset: GitPreset): GitPreset {
    const existing = this.presets.findIndex(p => p.id === preset.id)
    const saved: GitPreset = {
      ...preset,
      id: preset.id || uuid(),
      variables: extractTemplateVariables(preset.commands)
    }
    if (existing >= 0) {
      this.presets[existing] = saved
    } else {
      this.presets.push(saved)
    }
    this.save()
    return saved
  }

  deletePreset(id: string): void {
    const preset = this.presets.find(p => p.id === id)
    if (preset && preset.builtIn) return
    this.presets = this.presets.filter(p => p.id !== id)
    this.save()
  }

  private load(): void {
    try {
      const raw = readFileSync(this.savePath, 'utf-8')
      this.presets = JSON.parse(raw)
    } catch {
      // File missing or corrupt — seed below
    }

    if (this.presets.length === 0) {
      this.presets = BUILT_IN_PRESETS.map(p => ({ ...p, id: uuid() }))
      this.save()
    }
  }

  private save(): void {
    try {
      writeFileSync(this.savePath, JSON.stringify(this.presets, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
