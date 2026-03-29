import { motion } from 'framer-motion'
import { InlinePrompt } from '../command-center/InlinePrompt'
import { SessionSummaryCard } from './SessionSummaryCard'
import { QuickActionsCard } from './QuickActionsCard'
import { RecentCommitsCard } from './RecentCommitsCard'
import { RoutinesCard } from './RoutinesCard'
import { PlanCard } from './PlanCard'
import { useNerveCenterData } from '../../hooks/useNerveCenterData'
import { useProjectStore } from '../../stores/useProjectStore'
import { stagger, fadeUp } from '../../lib/animations'

export function NerveCenter() {
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const projectPath = selectedProject?.path

  const { git, commits, loading, refresh } = useNerveCenterData(projectPath)

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-4xl w-full mx-auto flex flex-col items-center"
      >
        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-2xl font-semibold text-turbo-text mb-1 mt-4"
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
        <motion.div variants={fadeUp} className="w-full max-w-3xl mb-8">
          <InlinePrompt hero />
        </motion.div>

        {/* Plan card (full width, only if plan exists) */}
        <motion.div variants={fadeUp} className="w-full mb-3">
          <PlanCard projectPath={projectPath} />
        </motion.div>

        {/* Row 1: 3-column grid */}
        <motion.div variants={fadeUp} className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <RoutinesCard />
          <SessionSummaryCard projectPath={projectPath} />
          <QuickActionsCard projectPath={projectPath ?? ''} branch={git?.branch ?? null} onGitRefresh={refresh} />
        </motion.div>

        {/* Row 2: Recent Commits */}
        <motion.div variants={fadeUp} className="w-full mb-6">
          <RecentCommitsCard commits={commits} loading={loading} />
        </motion.div>

        {/* Footer hint */}
        <motion.p
          variants={fadeUp}
          className="text-[11px] text-turbo-text-muted mt-2 mb-4"
        >
          <kbd className="kbd text-[10px] px-1.5 py-0.5">&#8984;K</kbd>
          {' '}for all commands
        </motion.p>
      </motion.div>
    </div>
  )
}
