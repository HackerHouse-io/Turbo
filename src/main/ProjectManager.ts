import { v4 as uuid } from 'uuid'
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import type { Project, AddProjectPayload, ScannedProject } from '../shared/types'
import { PROJECT_COLORS } from '../shared/constants'

/**
 * ProjectManager: Manages project registry with JSON file persistence.
 */
export class ProjectManager {
  private projects = new Map<string, Project>()
  private colorIndex = 0
  private savePath: string

  constructor(userDataPath: string) {
    this.savePath = join(userDataPath, 'projects.json')
    this.load()
  }

  addProject(payload: AddProjectPayload): Project {
    // Dedupe by path
    const existing = this.getProjectByPath(payload.path)
    if (existing) {
      this.touchProject(existing.id)
      return existing
    }

    const id = uuid()
    const project: Project = {
      id,
      name: payload.name,
      path: payload.path,
      color: payload.color || this.nextColor(),
      lastOpened: Date.now(),
      activeAgents: 0
    }
    this.projects.set(id, project)
    this.save()
    return project
  }

  removeProject(id: string): void {
    this.projects.delete(id)
    this.save()
  }

  listProjects(): Project[] {
    return Array.from(this.projects.values())
  }

  getRecentProjects(limit = 5): Project[] {
    return this.listProjects()
      .sort((a, b) => b.lastOpened - a.lastOpened)
      .slice(0, limit)
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id)
  }

  getProjectByPath(path: string): Project | undefined {
    for (const p of this.projects.values()) {
      if (p.path === path) return p
    }
    return undefined
  }

  touchProject(id: string): void {
    const project = this.projects.get(id)
    if (project) {
      project.lastOpened = Date.now()
      this.save()
    }
  }

  scanDirectory(dirPath: string): ScannedProject[] {
    const results: ScannedProject[] = []
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const fullPath = join(dirPath, entry.name)
        const hasGit = existsSync(join(fullPath, '.git'))
        const hasPackageJson = existsSync(join(fullPath, 'package.json'))
        // Only include directories that look like projects
        if (hasGit || hasPackageJson) {
          results.push({
            name: entry.name,
            path: fullPath,
            hasGit,
            hasPackageJson
          })
        }
      }
    } catch {
      // Directory not readable
    }
    return results
  }

  private nextColor(): string {
    const color = PROJECT_COLORS[this.colorIndex % PROJECT_COLORS.length]
    this.colorIndex++
    return color
  }

  private save(): void {
    try {
      const data = Array.from(this.projects.values())
      writeFileSync(this.savePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }

  private load(): void {
    try {
      if (!existsSync(this.savePath)) return
      const raw = readFileSync(this.savePath, 'utf-8')
      const data: Project[] = JSON.parse(raw)
      for (const project of data) {
        this.projects.set(project.id, project)
      }
      this.colorIndex = data.length
    } catch {
      // Load failed — start fresh
    }
  }
}
