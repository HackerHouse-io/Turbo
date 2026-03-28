import { useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentCard } from './AgentCard'
import { AttentionQueue } from './AttentionQueue'
import { InlinePrompt } from './InlinePrompt'
import { useCommandPaletteData } from '../command-palette/useCommandPaletteData'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitStore } from '../../stores/useGitStore'
import { useUIStore } from '../../stores/useUIStore'
import type { AgentSession, PromptTemplate, GitPreset } from '../../../../shared/types'

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
      <div className="h-full flex items-center justify-center px-6 py-4">
        <WelcomeState onAddProject={async () => {
          const folderPath = await window.api.openFolderDialog()
          if (folderPath) await addProjectFromPath(folderPath)
        }} />
      </div>
    )
  }

  // Empty state — launchpad with hero input, templates, git, recent
  if (isEmpty) {
    return <EmptyLaunchpad />
  }

  // Tasks state — cards + fixed bottom prompt
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <motion.div
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
      </div>

      {/* Fixed bottom prompt — only when tasks exist */}
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

// ─── Empty Launchpad ─────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

function EmptyLaunchpad() {
  const { templates, gitPresets } = useCommandPaletteData()
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const gitLoading = useGitStore(s => s.gitLoading)
  const gitLoadingMessage = useGitStore(s => s.gitLoadingMessage)
  const gitSuccess = useGitStore(s => s.gitSuccess)
  const gitError = useGitStore(s => s.gitError)
  const clearStatus = useGitStore(s => s.clearStatus)

  const projectPath = selectedProject?.path ?? ''

  // Auto-dismiss git status after 3s
  useEffect(() => {
    if (!gitSuccess && !gitError) return
    const t = setTimeout(clearStatus, 3000)
    return () => clearTimeout(t)
  }, [gitSuccess, gitError, clearStatus])

  const handleTemplateClick = useCallback((t: PromptTemplate) => {
    if (t.variables.length > 0) {
      openCommandPalette()
      return
    }
    window.api.createSession({
      projectPath,
      prompt: t.template,
      name: t.name,
      model: 'sonnet',
      effort: t.effort ?? 'medium',
      permissionMode: t.permissionMode
    })
  }, [projectPath, openCommandPalette])

  const handleGitClick = useCallback(async (g: GitPreset) => {
    if (!projectPath) return
    const store = useGitStore.getState()

    // Flow presets — generate AI message, open palette for confirm
    if (g.flow === 'quick-commit' || g.flow === 'full-commit-push') {
      const pushAfter = g.flow === 'full-commit-push'
      const result = await store.generateAIMessage(projectPath)
      if (result) {
        store.setPendingCommit({
          message: result.message,
          diffStat: result.diffStat,
          pushAfter
        })
        openCommandPalette()
      }
      return
    }

    // Direct presets — route to dedicated methods
    const cmd = g.commands[0] ?? ''
    if (cmd.startsWith('git add')) {
      await store.stageAll(projectPath)
    } else if (cmd.startsWith('git push')) {
      await store.push(projectPath)
    } else if (cmd.startsWith('git pull')) {
      await store.pullRebase(projectPath)
    } else {
      await store.execCommands(projectPath, g.commands)
    }
  }, [projectPath, openCommandPalette])

  return (
    <div className="h-full flex items-center justify-center px-6 overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-3xl w-full flex flex-col items-center -mt-8"
      >
        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-2xl font-semibold text-turbo-text mb-1"
        >
          What do you want to build?
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-sm text-turbo-text-dim mb-8"
        >
          {selectedProject?.name ?? 'Select a project'}
        </motion.p>

        {/* Hero input */}
        <motion.div variants={fadeUp} className="w-full mb-8">
          <InlinePrompt hero />
        </motion.div>

        {/* Quick Start templates */}
        {templates.length > 0 && (
          <motion.div variants={fadeUp} className="w-full mb-6">
            <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2">
              Quick Start
            </p>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateClick(t)}
                  className="flex items-center gap-3 p-3 rounded-lg
                             bg-turbo-surface border border-turbo-border
                             hover:border-turbo-accent/40 hover:bg-turbo-surface/80
                             transition-colors text-left group"
                >
                  <PaletteIcon icon={t.icon} className="w-5 h-5 text-turbo-text-muted group-hover:text-turbo-accent transition-colors" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-turbo-text block truncate">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-turbo-text-muted block truncate">
                      {t.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Git pills */}
        {gitPresets.length > 0 && (
          <motion.div variants={fadeUp} className="w-full mb-6">
            <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2">
              Git
            </p>
            <div className="flex flex-wrap gap-2">
              {gitPresets.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGitClick(g)}
                  disabled={gitLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                             font-medium text-turbo-text-dim
                             bg-turbo-surface border border-turbo-border
                             hover:border-turbo-accent/40 hover:text-turbo-text
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                >
                  <PaletteIcon icon={g.icon} className="w-3.5 h-3.5" />
                  {g.name}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {(gitLoading || gitSuccess || gitError) && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs mt-2 ${
                    gitError ? 'text-red-400' : gitLoading ? 'text-turbo-text-muted' : 'text-emerald-400'
                  }`}
                >
                  {gitLoading ? gitLoadingMessage || 'Running...' : gitError ?? gitSuccess}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Footer hint */}
        <motion.p
          variants={fadeUp}
          className="text-[11px] text-turbo-text-muted mt-2"
        >
          <kbd className="kbd text-[10px] px-1.5 py-0.5">&#8984;K</kbd>
          {' '}for all commands
        </motion.p>
      </motion.div>
    </div>
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
