import { useCallback, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useUIStore } from '../../stores/useUIStore'
import { usePlanData } from '../../hooks/usePlanData'
import { PlanSection } from './PlanSection'
import { PlanTableOfContents } from './PlanTableOfContents'
import { PlanBlockRenderer } from './PlanBlockRenderer'
import { PlanEmptyState, PLAN_GENERATION_PROMPT } from './PlanEmptyState'
import { slugify } from '../../../../shared/utils'
import { getIntent, buildSessionPayload } from '../../../../shared/intents'

export function PlanOverlay() {
  const closePlanOverlay = useUIStore(s => s.closePlanOverlay)
  const selectSession = useSessionStore(s => s.selectSession)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const projectPath = selectedProject?.path

  const {
    plan,
    filePath,
    lastModified,
    loading,
    found,
    saving,
    searchedPaths,
    toggleCheckbox,
    updateLine,
    insertLine,
    deleteLine,
    updateBlock,
    refresh
  } = usePlanData(projectPath)

  const progress = plan ? (plan.totalTasks > 0 ? plan.completedTasks / plan.totalTasks : 0) : 0
  const progressPct = Math.round(progress * 100)

  // ─── Start task in worktree ─────────────────────────────────
  const [launching, setLaunching] = useState(false)
  const launchingRef = useRef(false)

  const startTask = useCallback(async (taskContent: string) => {
    if (!projectPath) throw new Error('No project selected')
    if (launchingRef.current) return
    launchingRef.current = true
    setLaunching(true)
    try {
      const slug = await window.api.generateSlug(taskContent) || slugify(taskContent)
      const worktreeInfo = await window.api.createWorktree({ projectPath, slug })
      const payload = buildSessionPayload(getIntent('build'), taskContent, worktreeInfo.path)
      const session = await window.api.createSession(payload)

      if (session) {
        selectSession(session.id)
      }
      closePlanOverlay()
    } finally {
      launchingRef.current = false
      setLaunching(false)
    }
  }, [projectPath, closePlanOverlay, selectSession])

  const handleCreatePlan = useCallback(async () => {
    if (!projectPath) return
    closePlanOverlay()
    await window.api.createSession({
      projectPath,
      prompt: PLAN_GENERATION_PROMPT,
      name: 'Generate PLAN.md',
      permissionMode: 'auto'
    })
  }, [projectPath, closePlanOverlay])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex flex-col bg-black/50 backdrop-blur-sm"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={closePlanOverlay} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex flex-col mx-auto mt-12 mb-6 w-full max-w-5xl h-[calc(100vh-120px)] bg-turbo-surface rounded-xl border border-turbo-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-turbo-border flex-shrink-0">
          <button
            onClick={closePlanOverlay}
            className="text-turbo-text-muted hover:text-turbo-text transition-colors text-sm"
          >
            &#8592; Back
          </button>

          <div className="flex-1 flex items-center gap-3">
            <h2 className="text-sm font-medium text-turbo-text">PLAN.md</h2>

            {plan && plan.totalTasks > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-turbo-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-turbo-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] text-turbo-text-dim">{progressPct}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] text-turbo-text-muted">Saving...</span>
            )}
            <button
              onClick={refresh}
              className="text-turbo-text-muted hover:text-turbo-text transition-colors p-1"
              title="Refresh"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M11.5 7a4.5 4.5 0 01-8.14 2.64M2.5 7a4.5 4.5 0 018.14-2.64"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path d="M11.5 3v4h-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2.5 11V7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-turbo-text-muted">Loading...</span>
          </div>
        ) : !found ? (
          <PlanEmptyState searchedPaths={searchedPaths} onCreatePlan={handleCreatePlan} />
        ) : plan ? (
          <div className="flex-1 flex overflow-hidden">
            {/* TOC sidebar */}
            {plan.sections.length > 1 && (
              <div className="w-[200px] flex-shrink-0 border-r border-turbo-border overflow-y-auto py-3 px-2">
                <PlanTableOfContents sections={plan.sections} />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="max-w-3xl mx-auto">
                {/* Preamble blocks */}
                {plan.preamble.map((block, i) => (
                  <PlanBlockRenderer
                    key={`pre-${i}`}
                    block={block}
                    onToggleCheckbox={toggleCheckbox}
                    onEditLine={updateLine}
                    onDeleteLine={deleteLine}
                    onUpdateBlock={updateBlock}
                    onStartTask={startTask}
                    disableStartTask={launching}
                  />
                ))}

                {/* Sections */}
                {plan.sections.map((section, i) => (
                  <PlanSection
                    key={`section-${i}`}
                    id={`plan-section-${i}`}
                    section={section}
                    onToggleCheckbox={toggleCheckbox}
                    onEditLine={updateLine}
                    onDeleteLine={deleteLine}
                    onInsertLine={insertLine}
                    onUpdateBlock={updateBlock}
                    onStartTask={startTask}
                    disableStartTask={launching}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-turbo-text-muted">Your PLAN.md is empty</span>
          </div>
        )}

        {/* Footer */}
        {filePath && (
          <div className="px-5 py-2 border-t border-turbo-border flex items-center justify-between text-[10px] text-turbo-text-muted flex-shrink-0">
            <span className="font-mono truncate">{filePath}</span>
            {lastModified > 0 && (
              <span>Last modified: {new Date(lastModified).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}</span>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
