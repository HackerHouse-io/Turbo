import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { StatusStrip } from './StatusStrip'
import { QuickActions } from './QuickActions'
import { SessionList } from './SessionList'
import { WorkspacesSection } from './WorkspacesSection'
import { InlinePrompt } from './InlinePrompt'
import { PlaybookProgressBanner } from './PlaybookProgressBanner'
import { PlanCard } from '../nerve-center/PlanCard'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { usePlaybookStore } from '../../stores/usePlaybookStore'

export function CommandCenter() {
  const sessionsRecord = useSessionStore(s => s.sessions)
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)
  const playbookExecutions = usePlaybookStore(s => s.executions)
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Filter sessions by selected project
  const sessions = useMemo(() => {
    const all = Object.values(sessionsRecord)
    if (!selectedProject) return all
    return all.filter(s => s.projectPath === selectedProject.path)
  }, [sessionsRecord, selectedProject])

  // Filter active playbook executions
  const activePlaybooks = useMemo(() => {
    const all = Object.values(playbookExecutions)
    const projectFiltered = selectedProject
      ? all.filter(r => r.projectPath === selectedProject.path)
      : all
    return projectFiltered.filter(r => r.status !== 'completed')
  }, [playbookExecutions, selectedProject])

  const noProjects = projects.length === 0

  // First launch — no projects added yet
  if (noProjects) {
    return (
      <div className="h-full flex items-center justify-center px-6 py-4">
        <WelcomeState onAddProject={async () => {
          const folderPath = await window.api.openFolderDialog()
          if (folderPath) await addProjectFromPath(folderPath)
        }} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <StatusStrip projectPath={selectedProject?.path} />

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-1">
          {/* Quick Actions */}
          <QuickActions />

          {/* Plan Card */}
          <div className="px-4">
            <PlanCard projectPath={selectedProject?.path} />
          </div>

          {/* Playbook Banners */}
          {activePlaybooks.length > 0 && (
            <div className="px-4 py-2">
              <PlaybookProgressBanner executions={activePlaybooks} />
            </div>
          )}

          {/* Session List (always rendered) */}
          <SessionList sessions={sessions} activePlaybooks={activePlaybooks} />

          {/* Workspaces Section */}
          <WorkspacesSection />
        </div>
      </div>

      {/* Sticky bottom prompt */}
      <div className="flex-shrink-0 border-t border-turbo-border px-4 py-3">
        <InlinePrompt />
      </div>
    </div>
  )
}

// ─── Welcome state (no projects) ────────────────────────────────

export function WelcomeState({ onAddProject }: { onAddProject: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-full flex flex-col items-center justify-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-turbo-surface border border-turbo-border
                      flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-turbo-text mb-2">
        Welcome to Turbo
      </h2>
      <p className="text-sm text-turbo-text-dim mb-6 max-w-sm">
        Add a project to get started.
      </p>
      <button onClick={onAddProject} className="btn-primary flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        Add Project Folder
      </button>
    </motion.div>
  )
}
