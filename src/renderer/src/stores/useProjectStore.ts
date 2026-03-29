import { create } from 'zustand'
import type { Project } from '../../../shared/types'
import { useUIStore } from './useUIStore'

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  defaultProjectsDir: string
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  setProjects: (projects: Project[]) => void
  selectProject: (projectId: string | null) => void
  addProjectFromPath: (folderPath: string) => Promise<Project>
  removeProject: (projectId: string) => Promise<void>
  refreshProjects: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  defaultProjectsDir: '',
  initialized: false,

  initialize: async () => {
    if (get().initialized) return
    try {
      const [projects, defaultDir] = await Promise.all([
        window.api.listProjects(),
        window.api.getSetting('defaultProjectsDir') as Promise<string>
      ])
      set({
        projects,
        defaultProjectsDir: defaultDir || '',
        initialized: true,
        // Auto-select the first project if any exist
        selectedProjectId: projects.length > 0 ? projects[0].id : null
      })
    } catch (err) {
      console.error('Failed to initialize project store:', err)
      set({ initialized: true })
    }
  },

  setProjects: (projects) => set({ projects }),

  selectProject: (projectId) => {
    const ui = useUIStore.getState()
    ui.closeTerminalWorkspace()
    ui.closeTimeline()
    if (ui.viewMode === 'overview') {
      ui.setViewMode('dashboard')
    }
    set({ selectedProjectId: projectId })
  },

  addProjectFromPath: async (folderPath: string) => {
    const name = folderPath.split('/').pop() || folderPath
    const project = await window.api.addProject({ name, path: folderPath })
    const projects = await window.api.listProjects()
    set({ projects, selectedProjectId: project.id })
    return project
  },

  removeProject: async (projectId: string) => {
    await window.api.removeProject(projectId)
    const state = get()
    const projects = state.projects.filter(p => p.id !== projectId)
    set({
      projects,
      selectedProjectId:
        state.selectedProjectId === projectId
          ? (projects[0]?.id ?? null)
          : state.selectedProjectId
    })
  },

  refreshProjects: async () => {
    const projects = await window.api.listProjects()
    set({ projects })
  }
}))
