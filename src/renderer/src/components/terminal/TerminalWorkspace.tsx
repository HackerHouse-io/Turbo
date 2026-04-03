import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { useTerminalStore, MAX_PANES } from '../../stores/useTerminalStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { WorkspacePane } from './WorkspacePane'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { PlainTerminalType } from '../../../../shared/types'

export function TerminalWorkspace() {
  const closeTerminalWorkspace = useUIStore(s => s.closeTerminalWorkspace)
  const openTerminalWorkspace = useUIStore(s => s.openTerminalWorkspace)
  const terminals = useTerminalStore(s => s.terminals)
  const workspaces = useTerminalStore(s => s.workspaces)
  const activeWorkspaceId = useTerminalStore(s => s.activeWorkspaceId)
  const renameWorkspace = useTerminalStore(s => s.renameWorkspace)
  const addTerminalToWorkspace = useTerminalStore(s => s.addTerminalToWorkspace)

  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const projectPath = selectedProject?.path

  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null

  // Get all workspaces for this project (for tab bar)
  const projectWorkspaces = useMemo(() =>
    Object.values(workspaces)
      .filter(ws => ws.projectPath === projectPath)
      .sort((a, b) => a.createdAt - b.createdAt),
    [workspaces, projectPath]
  )

  const paneIds = activeWorkspace?.terminalIds ?? []
  const panes = paneIds.map(id => terminals[id]).filter(Boolean)
  const canAdd = panes.length < MAX_PANES

  // Editable name
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Reset editing state when switching workspaces
  useEffect(() => {
    setEditing(false)
    setEditName('')
  }, [activeWorkspaceId])

  useEffect(() => {
    if (editing) nameInputRef.current?.focus()
  }, [editing])

  const handleRename = () => {
    const trimmed = editName.trim()
    if (trimmed && activeWorkspaceId && trimmed !== activeWorkspace?.name) {
      renameWorkspace(activeWorkspaceId, trimmed)
    }
    setEditing(false)
  }

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleAdd = async (type: PlainTerminalType) => {
    if (!projectPath || !canAdd || !activeWorkspaceId) return
    setDropdownOpen(false)
    const terminal = await window.api.createPlainTerminal({ projectPath, type })
    if (terminal) {
      addTerminalToWorkspace(activeWorkspaceId, terminal.id)
    }
  }

  // Grid class based on pane count
  const gridClass = (() => {
    switch (panes.length) {
      case 1: return 'grid-cols-1 grid-rows-1'
      case 2: return 'grid-cols-2 grid-rows-1'
      case 3: return 'grid-cols-2 grid-rows-2'
      case 4: return 'grid-cols-2 grid-rows-2'
      default: return 'grid-cols-1 grid-rows-1'
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-40 flex flex-col bg-turbo-bg"
    >
        {/* Title bar spacer — clears macOS traffic lights */}
        <div className="drag-region h-8 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-turbo-border flex-shrink-0">
          <PaletteIcon icon="terminal" className="w-4 h-4 text-turbo-accent" />

          {/* Workspace tabs (if multiple) */}
          {projectWorkspaces.length > 1 ? (
            <div className="flex items-center gap-1 flex-1">
              {projectWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => openTerminalWorkspace(ws.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    ws.id === activeWorkspaceId
                      ? 'bg-turbo-accent/15 text-turbo-accent'
                      : 'text-turbo-text-dim hover:bg-turbo-surface-hover'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          ) : (
            /* Single workspace — editable name */
            editing ? (
              <input
                ref={nameInputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
                className="flex-1 text-sm font-medium text-turbo-text bg-transparent border-b border-turbo-accent focus:outline-none"
              />
            ) : (
              <h2
                className="text-sm font-medium text-turbo-text flex-1 cursor-pointer"
                onDoubleClick={() => {
                  if (activeWorkspace) {
                    setEditName(activeWorkspace.name)
                    setEditing(true)
                  }
                }}
              >
                {activeWorkspace?.name ?? 'Terminal Workspace'}
              </h2>
            )
          )}

          {/* Add dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => canAdd && setDropdownOpen(o => !o)}
              disabled={!canAdd}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                canAdd
                  ? 'bg-turbo-surface-active hover:bg-turbo-accent/20 text-turbo-text'
                  : 'bg-turbo-surface-active/50 text-turbo-text-muted cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-turbo-surface border border-turbo-border rounded-lg shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => handleAdd('shell')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-turbo-text hover:bg-turbo-surface-hover transition-colors"
                >
                  <PaletteIcon icon="terminal" className="w-3.5 h-3.5 text-turbo-text-muted" />
                  Shell
                </button>
                <button
                  onClick={() => handleAdd('claude')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-turbo-text hover:bg-turbo-surface-hover transition-colors"
                >
                  <PaletteIcon icon="bolt" className="w-3.5 h-3.5 text-turbo-text-muted" />
                  Claude Code
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={closeTerminalWorkspace}
            className="p-1.5 rounded-lg hover:bg-turbo-surface-active text-turbo-text-muted hover:text-turbo-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-2">
          {panes.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <PaletteIcon icon="terminal" className="w-10 h-10 text-turbo-text-muted" />
              <p className="text-sm text-turbo-text-muted">No terminals open</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdd('shell')}
                  className="btn-primary flex items-center gap-2 text-xs"
                >
                  <PaletteIcon icon="terminal" className="w-3.5 h-3.5" />
                  New Shell
                </button>
                <button
                  onClick={() => handleAdd('claude')}
                  className="btn-primary flex items-center gap-2 text-xs"
                >
                  <PaletteIcon icon="bolt" className="w-3.5 h-3.5" />
                  New Claude Code
                </button>
              </div>
            </div>
          ) : (
            /* Dynamic grid */
            <div className={`grid ${gridClass} gap-[1px] h-full bg-turbo-border rounded-lg overflow-hidden`}>
              {panes.map((terminal, index) => (
                <div
                  key={terminal.id}
                  className={`bg-turbo-bg ${
                    panes.length === 3 && index === 2 ? 'col-span-2' : ''
                  }`}
                >
                  <div className="h-full group">
                    <WorkspacePane terminal={terminal} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </motion.div>
  )
}
