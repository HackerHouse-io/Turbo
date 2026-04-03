import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTerminalStore, type Workspace, MAX_PANES } from '../../stores/useTerminalStore'
import { useUIStore } from '../../stores/useUIStore'
import { useProjectStore, selectProjectPath } from '../../stores/useProjectStore'
import { useConfirmAction } from '../../hooks/useConfirmAction'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import type { PlainTerminalType } from '../../../../shared/types'

export function WorkspacesSection() {
  const workspaces = useTerminalStore(s => s.workspaces)
  const terminals = useTerminalStore(s => s.terminals)
  const createWorkspace = useTerminalStore(s => s.createWorkspace)
  const addTerminalToWorkspace = useTerminalStore(s => s.addTerminalToWorkspace)
  const selectedProjectPath = useProjectStore(selectProjectPath)

  const projectWorkspaces = useMemo(() =>
    Object.values(workspaces)
      .filter(ws => ws.projectPath === selectedProjectPath)
      .sort((a, b) => a.createdAt - b.createdAt),
    [workspaces, selectedProjectPath]
  )

  const handleNewWorkspace = useCallback(async () => {
    if (!selectedProjectPath) return
    const wsId = createWorkspace(selectedProjectPath)
    const terminal = await window.api.createPlainTerminal({
      projectPath: selectedProjectPath,
      type: 'shell'
    })
    if (terminal) {
      addTerminalToWorkspace(wsId, terminal.id)
    }
  }, [selectedProjectPath, createWorkspace, addTerminalToWorkspace])

  return (
    <div className="px-4 py-3">
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-turbo-text-muted mb-2">
        Workspaces
      </h3>

      <div className="space-y-2">
        {projectWorkspaces.map(ws => (
          <WorkspaceCard key={ws.id} workspace={ws} terminals={terminals} />
        ))}

        <button
          onClick={handleNewWorkspace}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                     border border-dashed border-turbo-border text-xs text-turbo-text-muted
                     hover:border-turbo-accent/30 hover:text-turbo-text-dim transition-colors"
        >
          <PaletteIcon icon="plus" className="w-3.5 h-3.5" />
          New Workspace
        </button>
      </div>
    </div>
  )
}

// ─── Workspace Card ─────────────────────────────────────────

function WorkspaceCard({ workspace, terminals }: {
  workspace: Workspace
  terminals: Record<string, { id: string; type: string; projectPath: string }>
}) {
  const renameWorkspace = useTerminalStore(s => s.renameWorkspace)
  const deleteWorkspace = useTerminalStore(s => s.deleteWorkspace)
  const addTerminalToWorkspace = useTerminalStore(s => s.addTerminalToWorkspace)
  const removeTerminalFromWorkspace = useTerminalStore(s => s.removeTerminalFromWorkspace)
  const openTerminalWorkspace = useUIStore(s => s.openTerminalWorkspace)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(workspace.name)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { armed: confirmDelete, trigger: triggerDelete } = useConfirmAction(
    useCallback(() => deleteWorkspace(workspace.id), [deleteWorkspace, workspace.id])
  )

  const panes = workspace.terminalIds.map(id => terminals[id]).filter(Boolean)
  const canAdd = panes.length < MAX_PANES

  // Close dropdown on outside click
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

  // Focus input when editing
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== workspace.name) {
      renameWorkspace(workspace.id, trimmed)
    }
    setEditing(false)
  }

  const handleAdd = async (type: PlainTerminalType) => {
    setDropdownOpen(false)
    const terminal = await window.api.createPlainTerminal({
      projectPath: workspace.projectPath,
      type
    })
    if (terminal) {
      addTerminalToWorkspace(workspace.id, terminal.id)
    }
  }

  const handleKillTerminal = (terminalId: string) => {
    window.api.killPlainTerminal(terminalId)
    removeTerminalFromWorkspace(workspace.id, terminalId)
  }

  return (
    <div className="bg-turbo-surface border border-turbo-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <PaletteIcon icon="grid" className="w-3.5 h-3.5 text-turbo-text-muted flex-shrink-0" />

        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 text-xs font-medium text-turbo-text bg-transparent border-b border-turbo-accent focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium text-turbo-text cursor-pointer"
            onDoubleClick={() => { setEditName(workspace.name); setEditing(true) }}
          >
            {workspace.name}
          </span>
        )}

        <span className="text-[10px] text-turbo-text-muted">
          {panes.length}/{MAX_PANES}
        </span>

        {/* Open button */}
        <button
          onClick={() => openTerminalWorkspace(workspace.id)}
          className="px-2 py-1 rounded text-[10px] font-medium text-turbo-accent
                     hover:bg-turbo-accent/10 transition-colors"
        >
          Open
        </button>

        {/* Delete button */}
        <button
          onClick={triggerDelete}
          className={`p-1 rounded transition-colors ${
            confirmDelete
              ? 'bg-red-500/20 text-red-400'
              : 'text-turbo-text-muted hover:text-red-400 hover:bg-red-500/10'
          }`}
          title={confirmDelete ? 'Click again to confirm' : 'Delete workspace'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Terminal list */}
      {panes.length > 0 && (
        <div className="border-t border-turbo-border/50">
          {panes.map(terminal => (
            <div
              key={terminal.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-turbo-text-dim
                         hover:bg-turbo-surface-hover transition-colors"
            >
              <PaletteIcon
                icon={terminal.type === 'claude' ? 'bolt' : 'terminal'}
                className="w-3 h-3 text-turbo-text-muted"
              />
              <span className="flex-1">
                {terminal.type === 'claude' ? 'Claude Code' : 'Shell'}
              </span>
              <button
                onClick={() => handleKillTerminal(terminal.id)}
                className="p-0.5 rounded opacity-40 hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
                title="Kill terminal"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add terminal button */}
      <div className="border-t border-turbo-border/50 px-3 py-1.5 relative" ref={dropdownRef}>
        <button
          onClick={() => canAdd && setDropdownOpen(o => !o)}
          disabled={!canAdd}
          className={`flex items-center gap-1.5 text-[10px] transition-colors ${
            canAdd
              ? 'text-turbo-text-muted hover:text-turbo-text-dim cursor-pointer'
              : 'text-turbo-text-muted cursor-not-allowed'
          }`}
        >
          <PaletteIcon icon="plus" className="w-3 h-3" />
          Add Terminal
        </button>

        {dropdownOpen && (
          <div className="absolute left-3 bottom-full mb-1 w-36 bg-turbo-surface border border-turbo-border rounded-lg shadow-xl overflow-hidden z-50">
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
    </div>
  )
}
