import { useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCommandPaletteData } from '../command-palette/useCommandPaletteData'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useUIStore } from '../../stores/useUIStore'
import { useGitStore } from '../../stores/useGitStore'
import type { PromptTemplate, GitPreset } from '../../../../shared/types'

interface QuickActionsCardProps {
  projectPath: string
}

export function QuickActionsCard({ projectPath }: QuickActionsCardProps) {
  const { templates, gitPresets } = useCommandPaletteData()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openWithTemplate = useUIStore(s => s.openCommandPaletteWithTemplate)
  const gitLoading = useGitStore(s => s.gitLoading)
  const gitLoadingMessage = useGitStore(s => s.gitLoadingMessage)
  const gitSuccess = useGitStore(s => s.gitSuccess)
  const gitError = useGitStore(s => s.gitError)
  const clearStatus = useGitStore(s => s.clearStatus)

  // Auto-dismiss git status after 3s
  useEffect(() => {
    if (!gitSuccess && !gitError) return
    const t = setTimeout(clearStatus, 3000)
    return () => clearTimeout(t)
  }, [gitSuccess, gitError, clearStatus])

  const handleTemplateClick = useCallback((t: PromptTemplate) => {
    if (t.variables.length > 0) {
      openWithTemplate(t)
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
  }, [projectPath, openWithTemplate])

  const handleGitClick = useCallback(async (g: GitPreset) => {
    if (!projectPath) return
    const store = useGitStore.getState()

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
    <div className="card p-4">
      <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
        Quick Actions
      </h3>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-1.5">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => handleTemplateClick(t)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md
                           hover:bg-turbo-surface-hover
                           transition-colors text-left group"
              >
                <PaletteIcon icon={t.icon} className="w-4 h-4 text-turbo-text-muted group-hover:text-turbo-accent transition-colors" />
                <span className="text-xs font-medium text-turbo-text truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Git presets */}
      {gitPresets.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2">
            Git
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gitPresets.map(g => (
              <button
                key={g.id}
                onClick={() => handleGitClick(g)}
                disabled={gitLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                           font-medium text-turbo-text-dim
                           bg-turbo-surface border border-turbo-border
                           hover:border-turbo-accent/40 hover:text-turbo-text
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors"
              >
                <PaletteIcon icon={g.icon} className="w-3 h-3" />
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
                className={`text-[11px] mt-2 ${
                  gitError ? 'text-red-400' : gitLoading ? 'text-turbo-text-muted' : 'text-emerald-400'
                }`}
              >
                {gitLoading ? gitLoadingMessage || 'Running...' : gitError ?? gitSuccess}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
