import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitStore } from '../../stores/useGitStore'
import { useCommandPaletteData } from './useCommandPaletteData'
import { CommandPaletteTemplateFill, type SessionFlags } from './CommandPaletteTemplateFill'
import { CommandPaletteGitConfirm } from './CommandPaletteGitConfirm'
import { CommandPaletteGitPresetFill } from './CommandPaletteGitPresetFill'
import { CommandPaletteRoutineFill } from './CommandPaletteRoutineFill'
import { PaletteIcon } from './PaletteIcon'
import type { PromptTemplate, GitPreset, Routine } from '../../../../shared/types'

// ─── Types ───────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  section: 'recent' | 'projects' | 'templates' | 'routines' | 'git' | 'tasks' | 'actions'
  action: () => void
  keywords?: string[]
}

const SECTION_ORDER: CommandItem['section'][] = ['recent', 'projects', 'templates', 'routines', 'git', 'tasks', 'actions']
const SECTION_LABELS: Record<CommandItem['section'], string> = {
  recent: 'Recent Prompts',
  projects: 'Switch Project',
  templates: 'Templates',
  routines: 'Routines',
  git: 'Git Actions',
  tasks: 'Active Tasks',
  actions: 'Actions'
}

// ─── Modal Shell ─────────────────────────────────────────────

function PaletteShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg mx-4 bg-turbo-surface border border-turbo-border
                   rounded-xl shadow-2xl overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────

export function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fillTemplate, setFillTemplate] = useState<PromptTemplate | null>(null)
  const [fillGitPreset, setFillGitPreset] = useState<GitPreset | null>(null)
  const [fillRoutine, setFillRoutine] = useState<Routine | null>(null)
  const [gitConfirm, setGitConfirm] = useState<{ message: string; diffStat: string; pushAfter: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeCommandPalette = useUIStore(s => s.closeCommandPalette)
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const sessions = useMemo(() => Object.values(sessionsRecord), [sessionsRecord])
  const gitLoading = useGitStore(s => s.gitLoading)
  const selectedProjectPath = useProjectStore(s => {
    const id = s.selectedProjectId
    const proj = id ? s.projects.find(p => p.id === id) : s.projects[0]
    return proj?.path
  })
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const { templates, gitPresets, routines, models, loading } = useCommandPaletteData()

  useEffect(() => {
    inputRef.current?.focus()

    // Hydrate git confirm from pending commit (set by launchpad git buttons)
    const pending = useGitStore.getState().pendingCommit
    if (pending) {
      setGitConfirm({ message: pending.message, diffStat: pending.diffStat, pushAfter: pending.pushAfter })
      useGitStore.getState().setPendingCommit(null)
    }

    // Hydrate template fill from pending template (set by quick actions)
    const pendingTemplate = useUIStore.getState().pendingTemplateFill
    if (pendingTemplate) {
      setFillTemplate(pendingTemplate)
      useUIStore.setState({ pendingTemplateFill: null })
    }

    // Hydrate routine fill from pending routine (set by detail overlay Run)
    const pendingRoutine = useUIStore.getState().pendingRoutineFill
    if (pendingRoutine) {
      setFillRoutine(pendingRoutine)
      useUIStore.setState({ pendingRoutineFill: null })
    }
  }, [])

  // ─── Create session helper ─────────────────────────────────

  const createSession = useCallback((prompt: string, flags?: SessionFlags) => {
    if (!selectedProjectPath) return
    window.api.createSession({
      projectPath: selectedProjectPath,
      prompt,
      permissionMode: flags?.permissionMode,
      effort: flags?.effort,
      model: flags?.model
    })
    closeCommandPalette()
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Git action handler ────────────────────────────────────

  const handleGitAction = useCallback(async (preset: GitPreset) => {
    if (!selectedProjectPath) return

    // Special AI commit flows
    if (preset.flow === 'quick-commit' || preset.flow === 'full-commit-push') {
      const pushAfter = preset.flow === 'full-commit-push'
      const result = await useGitStore.getState().generateAIMessage(selectedProjectPath)
      if (result) {
        setGitConfirm({ message: result.message, diffStat: result.diffStat, pushAfter })
      }
      return
    }

    // Custom preset with variables
    if (preset.variables.length > 0) {
      setFillGitPreset(preset)
      return
    }

    // Direct execution
    await useGitStore.getState().execCommands(selectedProjectPath, preset.commands)
    closeCommandPalette()
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Git confirm handler ───────────────────────────────────

  const handleGitConfirm = useCallback(async (message: string) => {
    if (!selectedProjectPath || !gitConfirm) return

    const commitResult = await useGitStore.getState().commit(selectedProjectPath, message)
    if (commitResult.success && gitConfirm.pushAfter) {
      await useGitStore.getState().push(selectedProjectPath)
    }
    setGitConfirm(null)
    closeCommandPalette()
  }, [selectedProjectPath, gitConfirm, closeCommandPalette])

  // ─── Git preset fill handler ───────────────────────────────

  const handleGitPresetFill = useCallback(async (commands: string[]) => {
    if (!selectedProjectPath) return
    await useGitStore.getState().execCommands(selectedProjectPath, commands)
    setFillGitPreset(null)
    closeCommandPalette()
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Routine handler ───────────────────────────────────────

  const handleStartRoutine = useCallback(async (routineId: string, variables: Record<string, string>) => {
    if (!selectedProjectPath) return
    await window.api.startRoutine({ routineId, projectPath: selectedProjectPath, variables })
    closeCommandPalette()
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Build command list ────────────────────────────────────

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []

    // Projects
    for (const p of projects) {
      const isCurrent = p.id === selectedProjectId
      items.push({
        id: `project-${p.id}`,
        label: p.name,
        description: isCurrent ? 'current project' : p.path,
        icon: 'task',
        section: 'projects',
        action: () => {
          useProjectStore.getState().selectProject(p.id)
          closeCommandPalette()
        },
        keywords: [p.path, p.name, 'project', 'switch']
      })
    }

    // Templates
    for (const t of templates) {
      items.push({
        id: `template-${t.id}`,
        label: t.name,
        description: t.description,
        icon: t.icon,
        section: 'templates',
        action: () => {
          if (t.variables.length === 0) {
            createSession(t.template, {
              permissionMode: t.permissionMode,
              effort: t.effort
            })
          } else {
            setFillTemplate(t)
          }
        },
        keywords: [t.description, t.template]
      })
    }

    // Routines
    for (const r of routines) {
      items.push({
        id: `routine-${r.id}`,
        label: r.name,
        description: r.description,
        icon: 'routine',
        section: 'routines',
        action: () => {
          if (r.variables.length === 0) {
            handleStartRoutine(r.id, {})
          } else {
            setFillRoutine(r)
          }
        },
        keywords: [r.description, ...r.steps.map(s => s.name)]
      })
    }

    // Git Actions
    for (const g of gitPresets) {
      items.push({
        id: `git-${g.id}`,
        label: g.name,
        description: g.description,
        icon: g.icon,
        section: 'git',
        action: () => handleGitAction(g),
        keywords: ['git', g.description, ...g.commands]
      })
    }

    // Active Tasks
    for (const s of sessions) {
      items.push({
        id: `session-${s.id}`,
        label: s.name,
        description: `${s.status} - ${s.lastActivity}`,
        icon: 'task',
        section: 'tasks',
        action: () => {
          closeCommandPalette()
          selectSession(s.id)
          setViewMode('detail')
        },
        keywords: [s.status, s.projectPath]
      })
    }

    // Actions
    items.push({
      id: 'action-open-terminal',
      label: 'Open Terminal',
      description: 'Open a shell in the current project',
      icon: 'terminal',
      section: 'actions',
      action: async () => {
        if (!selectedProjectPath) return
        await window.api.createPlainTerminal({ projectPath: selectedProjectPath, type: 'shell' })
        closeCommandPalette()
        useUIStore.getState().openTerminalWorkspace()
      },
      keywords: ['terminal', 'shell', 'bash', 'zsh', 'console']
    })

    items.push({
      id: 'action-open-claude',
      label: 'Open Claude Code',
      description: 'Interactive Claude session in the current project',
      icon: 'bolt',
      section: 'actions',
      action: async () => {
        if (!selectedProjectPath) return
        await window.api.createPlainTerminal({ projectPath: selectedProjectPath, type: 'claude' })
        closeCommandPalette()
        useUIStore.getState().openTerminalWorkspace()
      },
      keywords: ['claude', 'code', 'repl', 'interactive', 'ai', 'agent']
    })

    items.push({
      id: 'action-terminal-workspace',
      label: 'Terminal Workspace',
      description: 'Open the multi-terminal workspace',
      icon: 'terminal',
      section: 'actions',
      action: () => {
        closeCommandPalette()
        useUIStore.getState().openTerminalWorkspace()
      },
      keywords: ['workspace', 'terminals', 'panes', 'split']
    })

    return items
  }, [projects, selectedProjectId, templates, routines, gitPresets, sessions, selectedProjectPath, createSession, handleGitAction, handleStartRoutine, closeCommandPalette, selectSession, setViewMode])

  // ─── Filtering ─────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }, [commands, query])

  const clampedIndex = Math.min(selectedIndex, Math.max(filtered.length - 1, 0))

  // ─── Grouped by section (single pass) ─────────────────────

  const grouped = useMemo(() => {
    const bySection = new Map<CommandItem['section'], { item: CommandItem; globalIndex: number }[]>()
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i]
      let arr = bySection.get(item.section)
      if (!arr) {
        arr = []
        bySection.set(item.section, arr)
      }
      arr.push({ item, globalIndex: i })
    }
    return SECTION_ORDER
      .filter(s => bySection.has(s))
      .map(s => ({ section: s, items: bySection.get(s)! }))
  }, [filtered])

  // ─── Keyboard ──────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[clampedIndex]) {
          filtered[clampedIndex].action()
        }
        break
      case 'Escape':
        closeCommandPalette()
        break
    }
  }

  // ─── Routine fill mode ──────────────────────────────────────

  if (fillRoutine) {
    return (
      <PaletteShell onClose={closeCommandPalette}>
        <CommandPaletteRoutineFill
          routine={fillRoutine}
          onSubmit={(variables) => handleStartRoutine(fillRoutine.id, variables)}
          onBack={() => setFillRoutine(null)}
        />
      </PaletteShell>
    )
  }

  // ─── Git confirm mode ───────────────────────────────────────

  if (gitConfirm) {
    return (
      <PaletteShell onClose={closeCommandPalette}>
        <CommandPaletteGitConfirm
          message={gitConfirm.message}
          diffStat={gitConfirm.diffStat}
          pushAfter={gitConfirm.pushAfter}
          loading={gitLoading}
          onConfirm={handleGitConfirm}
          onBack={() => setGitConfirm(null)}
        />
      </PaletteShell>
    )
  }

  // ─── Git preset fill mode ──────────────────────────────────

  if (fillGitPreset) {
    return (
      <PaletteShell onClose={closeCommandPalette}>
        <CommandPaletteGitPresetFill
          preset={fillGitPreset}
          loading={gitLoading}
          onSubmit={handleGitPresetFill}
          onBack={() => setFillGitPreset(null)}
        />
      </PaletteShell>
    )
  }

  // ─── Template fill mode ────────────────────────────────────

  if (fillTemplate) {
    return (
      <PaletteShell onClose={closeCommandPalette}>
        <CommandPaletteTemplateFill
          template={fillTemplate}
          models={models}
          onSubmit={(prompt, flags) => createSession(prompt, flags)}
          onBack={() => setFillTemplate(null)}
        />
      </PaletteShell>
    )
  }

  // ─── Search mode ───────────────────────────────────────────

  return (
    <PaletteShell onClose={closeCommandPalette}>
      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-turbo-border">
        <PaletteIcon icon="search" className="w-4 h-4 text-turbo-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, projects, templates..."
          className="flex-1 bg-transparent text-sm text-turbo-text placeholder:text-turbo-text-muted
                     focus:outline-none"
        />
        <kbd className="kbd text-[10px]">Esc</kbd>
      </div>

      {/* Results grouped by section */}
      <div className="max-h-80 overflow-y-auto py-1">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-turbo-text-muted">Loading...</div>
        ) : grouped.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-turbo-text-muted">
            No results found
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.section}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted">
                  {SECTION_LABELS[group.section]}
                </span>
              </div>
              {group.items.map(({ item, globalIndex }) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    globalIndex === clampedIndex
                      ? 'bg-turbo-accent/10 text-turbo-text'
                      : 'text-turbo-text-dim hover:bg-turbo-surface-hover'
                  }`}
                >
                  <PaletteIcon
                    icon={item.icon}
                    className={`w-4 h-4 ${globalIndex === clampedIndex ? 'text-turbo-accent' : 'text-turbo-text-muted'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-turbo-text-muted ml-2">{item.description}</span>
                    )}
                  </div>
                  {globalIndex === clampedIndex && (
                    <kbd className="kbd text-[10px]">&#8617;</kbd>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </PaletteShell>
  )
}
