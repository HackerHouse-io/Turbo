import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useCommandPaletteData } from './useCommandPaletteData'
import { CommandPaletteTemplateFill } from './CommandPaletteTemplateFill'
import { PaletteIcon } from './PaletteIcon'
import { timeAgo } from '../../lib/format'
import type { PromptTemplate, CreateSessionPayload } from '../../../../shared/types'

// ─── Types ───────────────────────────────────────────────────

type SessionFlags = Pick<CreateSessionPayload, 'permissionMode' | 'effort'>

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  section: 'recent' | 'templates' | 'tasks' | 'actions'
  action: () => void
  keywords?: string[]
}

const SECTION_ORDER: CommandItem['section'][] = ['recent', 'templates', 'tasks', 'actions']
const SECTION_LABELS: Record<CommandItem['section'], string> = {
  recent: 'Recent Prompts',
  templates: 'Templates',
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
  const inputRef = useRef<HTMLInputElement>(null)
  const closeCommandPalette = useUIStore(s => s.closeCommandPalette)
  const selectSession = useSessionStore(s => s.selectSession)
  const setViewMode = useUIStore(s => s.setViewMode)
  const sessionsRecord = useSessionStore(s => s.sessions)
  const sessions = useMemo(() => Object.values(sessionsRecord), [sessionsRecord])
  const selectedProjectPath = useProjectStore(s => {
    const id = s.selectedProjectId
    const proj = id ? s.projects.find(p => p.id === id) : s.projects[0]
    return proj?.path
  })
  const { templates, history, loading } = useCommandPaletteData()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ─── Create session helper ─────────────────────────────────

  const createSession = useCallback((prompt: string, flags?: SessionFlags) => {
    if (!selectedProjectPath) return
    window.api.createSession({
      projectPath: selectedProjectPath,
      prompt,
      permissionMode: flags?.permissionMode,
      effort: flags?.effort
    })
    closeCommandPalette()
  }, [selectedProjectPath, closeCommandPalette])

  // ─── Build command list ────────────────────────────────────

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []

    // Recent Prompts
    for (const h of history.slice(0, 10)) {
      items.push({
        id: `history-${h.id}`,
        label: h.prompt.length > 60 ? h.prompt.slice(0, 57) + '...' : h.prompt,
        description: timeAgo(h.timestamp),
        icon: 'clock',
        section: 'recent',
        action: () => createSession(h.prompt),
        keywords: [h.prompt]
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
      id: 'action-clear-history',
      label: 'Clear Prompt History',
      icon: 'trash',
      section: 'actions',
      action: () => {
        window.api.clearPromptHistory()
        closeCommandPalette()
      }
    })

    return items
  }, [history, templates, sessions, createSession, closeCommandPalette, selectSession, setViewMode])

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

  // ─── Template fill mode ────────────────────────────────────

  if (fillTemplate) {
    return (
      <PaletteShell onClose={closeCommandPalette}>
        <CommandPaletteTemplateFill
          template={fillTemplate}
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
          placeholder="Search prompts, templates, tasks..."
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
