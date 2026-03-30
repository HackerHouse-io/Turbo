import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/useUIStore'
import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useSessionStore } from '../../stores/useSessionStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { ProjectSelector } from '../project/ProjectSelector'
import { GitIdentitySelector } from '../git/GitIdentitySelector'

export function TopBar() {
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openSettings = useUIStore(s => s.openSettings)
  const projectSelectorOpen = useUIStore(s => s.projectSelectorOpen)
  const toggleProjectSelector = useUIStore(s => s.toggleProjectSelector)
  const rawItems = useSessionStore(s => s.attentionItems)
  const attentionItems = useMemo(() => rawItems.filter(i => !i.dismissed), [rawItems])

  const projects = useProjectStore(s => s.projects)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const currentResolved = useGitIdentityStore(s => s.currentResolved)

  const [gitDropdownOpen, setGitDropdownOpen] = useState(false)

  // Count active tasks across all projects for queue badge
  const sessionsRecord = useSessionStore(s => s.sessions)
  const queueCount = useMemo(() => {
    return Object.values(sessionsRecord).filter(
      s => s.status === 'active' || s.status === 'starting'
    ).length
  }, [sessionsRecord])

  return (
    <div className="no-drag relative z-40 flex items-center gap-3 px-4 py-2 border-b border-turbo-border bg-turbo-bg/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-md bg-turbo-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">T</span>
        </div>
        <span className="text-sm font-semibold text-turbo-text">Turbo</span>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="relative">
          <button
            onClick={toggleProjectSelector}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-turbo-surface border border-turbo-border text-sm
                       hover:border-turbo-border-bright transition-colors cursor-pointer"
          >
            {selectedProject && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              />
            )}
            <span className="text-turbo-text font-medium truncate max-w-[140px]">
              {selectedProject?.name || 'Select Project'}
            </span>
            <ChevronIcon />
          </button>
          <AnimatePresence>
            {projectSelectorOpen && <ProjectSelector />}
          </AnimatePresence>
        </div>
      )}

      {/* Search / Command Palette trigger */}
      <button
        onClick={openCommandPalette}
        className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 rounded-lg
                   bg-turbo-surface border border-turbo-border text-turbo-text-muted
                   hover:border-turbo-border-bright hover:text-turbo-text-dim
                   transition-colors text-sm cursor-pointer"
      >
        <SearchIcon />
        <span>Search or command...</span>
        <span className="ml-auto flex items-center gap-1">
          <kbd className="kbd">&#8984;K</kbd>
        </span>
      </button>

      {/* Git Identity Badge */}
      {currentResolved && (
        <div className="relative">
          <button
            onClick={() => setGitDropdownOpen(o => !o)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg
                       bg-turbo-surface border border-turbo-border text-xs
                       hover:border-turbo-border-bright transition-colors cursor-pointer"
          >
            <GitBranchIcon />
            {currentResolved.source !== 'none' && currentResolved.identity ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-turbo-text-dim truncate max-w-[180px]">
                  {currentResolved.identity.name} &lt;{currentResolved.identity.email}&gt;
                </span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                <span className="text-yellow-400/80">No git identity</span>
              </>
            )}
            <ChevronIcon />
          </button>
          <AnimatePresence>
            {gitDropdownOpen && (
              <GitIdentitySelector onClose={() => setGitDropdownOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Settings */}
        <button
          onClick={openSettings}
          className="p-1.5 rounded-lg hover:bg-turbo-surface-active text-turbo-text-muted
                     hover:text-turbo-text transition-colors"
          title="Settings"
        >
          <PaletteIcon icon="gear" className="w-4 h-4" />
        </button>

        {/* Queue count */}
        {queueCount > 0 && (
          <span className="text-xs text-turbo-text-muted px-2 py-1 rounded-md bg-turbo-surface border border-turbo-border">
            Queue: {queueCount}
          </span>
        )}

        {/* Attention Queue Badge */}
        {attentionItems.length > 0 && (
          <button
            className="relative btn-ghost flex items-center gap-1.5"
            onClick={() => {
              if (attentionItems.length > 0) {
                useSessionStore.getState().selectSession(attentionItems[0].sessionId)
                useUIStore.getState().setViewMode('detail')
              }
            }}
          >
            <BellIcon />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-turbo-warning
                           text-[10px] font-bold text-black flex items-center justify-center">
              {attentionItems.length}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function GitBranchIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8.5v7m12-2.5c0 2.5-2 4-6 4h-0" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-3 h-3 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
