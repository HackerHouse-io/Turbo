import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentCard } from './AgentCard'
import { AttentionQueue } from './AttentionQueue'
import { InlinePrompt } from './InlinePrompt'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import type { AgentSession } from '../../../../shared/types'

export function CommandCenter() {
  const sessionsRecord = useSessionStore(s => s.sessions)
  const rawItems = useSessionStore(s => s.attentionItems)
  const attentionItems = useMemo(() => rawItems.filter(i => !i.dismissed), [rawItems])

  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Filter sessions by selected project
  const sessions = useMemo(() => {
    const all = Object.values(sessionsRecord)
    if (!selectedProject) return all
    return all.filter(s => s.projectPath === selectedProject.path)
  }, [sessionsRecord, selectedProject])

  // Categorize sessions — needsAttention sessions stay in inProgress (card shows yellow badge)
  const inProgress = sessions.filter(
    s => s.status === 'active' || s.status === 'starting'
  )
  const waitingForInput = sessions.filter(
    s => s.status === 'waiting_for_input'
  )
  const completed = sessions.filter(
    s => s.status === 'completed' || s.status === 'stopped'
  )

  const isEmpty = sessions.length === 0
  const noProjects = projects.length === 0

  // First launch — no projects added yet
  if (noProjects) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <WelcomeState onAddProject={async () => {
            const folderPath = await window.api.openFolderDialog()
            if (folderPath) await addProjectFromPath(folderPath)
          }} />
        </div>
        <div className="flex-shrink-0 px-6 pb-4">
          <InlinePrompt />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable task area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full flex flex-col items-center justify-center text-center -mt-10"
            >
              <div className="w-16 h-16 rounded-2xl bg-turbo-surface border border-turbo-border
                              flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-turbo-text mb-2">
                No tasks yet in {selectedProject?.name || 'this project'}
              </h2>
              <p className="text-sm text-turbo-text-dim mb-2 max-w-sm">
                What do you want to work on?
              </p>
              <InlinePrompt />
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* Attention Queue */}
              {attentionItems.length > 0 && (
                <AttentionQueue items={attentionItems} />
              )}

              {/* Waiting for Input */}
              {waitingForInput.length > 0 && (
                <Section
                  title="Waiting for Input"
                  count={waitingForInput.length}
                  variant="info"
                >
                  {waitingForInput.map(s => (
                    <AgentCard key={s.id} session={s} />
                  ))}
                </Section>
              )}

              {/* In Progress */}
              {inProgress.length > 0 && (
                <Section
                  title="In Progress"
                  count={inProgress.length}
                  variant="default"
                >
                  {inProgress.map(s => (
                    <AgentCard key={s.id} session={s} />
                  ))}
                </Section>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <Section
                  title="Completed"
                  count={completed.length}
                  variant="success"
                >
                  {completed.map(s => (
                    <AgentCard key={s.id} session={s} />
                  ))}
                </Section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed bottom prompt */}
      <div className="flex-shrink-0 px-6 pb-4">
        <InlinePrompt />
      </div>
    </div>
  )
}

// ─── Section wrapper ────────────────────────────────────────────

function Section({
  title,
  count,
  variant,
  children
}: {
  title: string
  count: number
  variant: 'warning' | 'info' | 'success' | 'default'
  children: React.ReactNode
}) {
  const dotColor = {
    warning: 'bg-turbo-warning',
    info: 'bg-turbo-info',
    success: 'bg-turbo-success',
    default: 'bg-turbo-accent'
  }[variant]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h2 className="text-sm font-medium text-turbo-text-dim uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-xs text-turbo-text-muted">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  )
}

// ─── Welcome state (no projects) ────────────────────────────────

function WelcomeState({ onAddProject }: { onAddProject: () => void }) {
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
