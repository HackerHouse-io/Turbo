import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'

export function ProjectSelector() {
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const selectProject = useProjectStore(s => s.selectProject)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)
  const closeProjectSelector = useUIStore(s => s.closeProjectSelector)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const ref = useRef<HTMLDivElement>(null)

  // Count active tasks per project
  const sessions = useMemo(() => Object.values(sessionsRecord), [sessionsRecord])
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of sessions) {
      if (s.status === 'active' || s.status === 'starting' || s.status === 'waiting_for_input') {
        const project = projects.find(p => p.path === s.projectPath)
        if (project) {
          counts[project.id] = (counts[project.id] || 0) + 1
        }
      }
    }
    return counts
  }, [sessions, projects])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeProjectSelector()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeProjectSelector])

  const handleAddProject = async () => {
    const folderPath = await window.api.openFolderDialog()
    if (folderPath) {
      await addProjectFromPath(folderPath)
    }
    closeProjectSelector()
  }

  const handleSelect = (projectId: string) => {
    selectProject(projectId)
    closeProjectSelector()
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 mt-1 w-64 bg-turbo-surface border border-turbo-border
                 rounded-lg shadow-2xl overflow-hidden z-50"
    >
      <div className="py-1">
        {projects.map(project => {
          const count = taskCounts[project.id] || 0
          const isSelected = project.id === selectedProjectId
          return (
            <button
              key={project.id}
              onClick={() => handleSelect(project.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                isSelected
                  ? 'bg-turbo-accent/10 text-turbo-text'
                  : 'text-turbo-text-dim hover:bg-turbo-surface-hover'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-sm font-medium truncate flex-1">{project.name}</span>
              {count > 0 ? (
                <span className="text-[10px] text-turbo-accent font-medium">
                  {count} {count === 1 ? 'task' : 'tasks'}
                </span>
              ) : (
                <span className="text-[10px] text-turbo-text-muted">(idle)</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="border-t border-turbo-border py-1">
        <button
          onClick={handleAddProject}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-turbo-text-dim
                     hover:bg-turbo-surface-hover transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Project
        </button>
      </div>
    </motion.div>
  )
}
