import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useTerminalStore } from '../../stores/useTerminalStore'
import { PaletteIcon } from './PaletteIcon'
import { runInTerminalDrawer, resolveGitCommand } from '../../lib/runInTerminalDrawer'
import { useGitQuickActions } from '../../hooks/useGitQuickActions'

// ─── Types ───────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  section: 'projects' | 'git' | 'tasks' | 'actions'
  action: () => void
  keywords?: string[]
}

const SECTION_ORDER: CommandItem['section'][] = ['projects', 'git', 'tasks', 'actions']
const SECTION_LABELS: Record<CommandItem['section'], string> = {
  projects: 'Switch Project',
  git: 'Git Actions',
  tasks: 'Sessions',
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
  const inputRef = useRef<HTMLInputElement>(null)
  const closeCommandPalette = useUIStore(s => s.closeCommandPalette)
  const selectSession = useSessionStore(s => s.selectSession)
  const focusSession = useSessionStore(s => s.focusSession)
  const pinSession = useSessionStore(s => s.pinSession)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const sessions = useMemo(() => Object.values(sessionsRecord), [sessionsRecord])
  const selectedProjectPath = useProjectStore(selectProjectPath)
  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const gitActions = useGitQuickActions()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ─── Git action handler ────────────────────────────────────

  const handleGitAction = useCallback(async (command: string, aiCommit?: boolean) => {
    if (!selectedProjectPath) return
    closeCommandPalette()
    const resolved = await resolveGitCommand(selectedProjectPath, command, aiCommit)
    await runInTerminalDrawer(selectedProjectPath, resolved)
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Open terminal helper ──────────────────────────────────

  const openTerminalAction = useCallback(async (type: 'shell' | 'claude') => {
    if (!selectedProjectPath) return
    const termStore = useTerminalStore.getState()
    const projectWs = Object.values(termStore.workspaces)
      .filter(ws => ws.projectPath === selectedProjectPath)
      .sort((a, b) => a.createdAt - b.createdAt)
    const wsId = projectWs.length > 0 ? projectWs[0].id : termStore.createWorkspace(selectedProjectPath)
    const terminal = await window.api.createPlainTerminal({ projectPath: selectedProjectPath, type })
    if (terminal) termStore.addTerminalToWorkspace(wsId, terminal.id)
    closeCommandPalette()
    useUIStore.getState().openTerminalWorkspace(wsId)
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

    // Git Actions
    for (const g of gitActions) {
      items.push({
        id: `git-${g.id}`,
        label: g.label,
        description: g.command,
        icon: g.icon,
        section: 'git',
        action: () => handleGitAction(g.command, g.aiCommit),
        keywords: ['git', g.label, g.command]
      })
    }

    // Sessions
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
          pinSession(s.id)
          focusSession(s.id)
        },
        keywords: [s.status, s.projectPath]
      })
    }

    // Actions
    items.push({
      id: 'action-settings',
      label: 'Settings',
      description: 'Configure Turbo preferences',
      icon: 'gear',
      section: 'actions',
      action: () => {
        closeCommandPalette()
        useUIStore.getState().openSettings()
      },
      keywords: ['settings', 'preferences', 'config']
    })

    items.push({
      id: 'action-session-timeline',
      label: 'Session Timeline',
      description: 'View work history and session activity',
      icon: 'clock',
      section: 'actions',
      action: () => {
        closeCommandPalette()
        useUIStore.getState().openTimeline()
      },
      keywords: ['timeline', 'sessions', 'history']
    })

    items.push({
      id: 'action-open-terminal',
      label: 'Open Terminal',
      description: 'Open a shell in the current project',
      icon: 'terminal',
      section: 'actions',
      action: () => openTerminalAction('shell'),
      keywords: ['terminal', 'shell', 'bash', 'zsh']
    })

    items.push({
      id: 'action-open-claude',
      label: 'Open Claude Code',
      description: 'Interactive Claude session in the current project',
      icon: 'bolt',
      section: 'actions',
      action: () => openTerminalAction('claude'),
      keywords: ['claude', 'code', 'interactive', 'ai']
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
      keywords: ['workspace', 'terminals', 'panes']
    })

    return items
  }, [projects, selectedProjectId, gitActions, sessions, selectedProjectPath, handleGitAction, openTerminalAction, closeCommandPalette, selectSession, focusSession, pinSession])

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

  // ─── Grouped by section ───────────────────────────────────

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
          placeholder="Search commands, projects, sessions..."
          className="flex-1 bg-transparent text-sm text-turbo-text placeholder:text-turbo-text-muted
                     focus:outline-none"
        />
        <kbd className="kbd text-[10px]">Esc</kbd>
      </div>

      {/* Results grouped by section */}
      <div className="max-h-80 overflow-y-auto py-1">
        {grouped.length === 0 ? (
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
