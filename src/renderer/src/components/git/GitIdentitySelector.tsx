import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGitIdentityStore } from '../../stores/useGitIdentityStore'
import { useProjectStore } from '../../stores/useProjectStore'
import type { GitIdentity } from '../../../../shared/types'

const SOURCE_LABELS: Record<string, string> = {
  'project-override': 'Project override',
  'project-gitconfig': 'Project .git/config',
  'global-override': 'Global override',
  'global-gitconfig': '~/.gitconfig',
  'none': 'Not configured'
}

export function GitIdentitySelector({ onClose }: { onClose: () => void }) {
  const currentResolved = useGitIdentityStore(s => s.currentResolved)
  const selectedProjectId = useProjectStore(s => s.selectedProjectId)
  const projects = useProjectStore(s => s.projects)
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const [mode, setMode] = useState<'view' | 'edit-global' | 'edit-project'>('view')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleStartEdit = (scope: 'edit-global' | 'edit-project') => {
    const identity = currentResolved?.identity
    setName(identity?.name || '')
    setEmail(identity?.email || '')
    setMode(scope)
  }

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return
    const identity: GitIdentity = { name: name.trim(), email: email.trim() }

    if (mode === 'edit-global') {
      await window.api.setGlobalGitIdentity(identity)
    } else if (mode === 'edit-project' && selectedProjectId) {
      await window.api.setProjectGitIdentity(selectedProjectId, identity)
    }

    // Re-resolve
    if (selectedProject?.path) {
      await useGitIdentityStore.getState().resolveForProject(selectedProject.path)
    }
    setMode('view')
  }

  const handleClearProjectOverride = async () => {
    if (!selectedProjectId || !selectedProject?.path) return
    await window.api.setProjectGitIdentity(selectedProjectId, undefined)
    await useGitIdentityStore.getState().resolveForProject(selectedProject.path)
  }

  if (mode !== 'view') {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full right-0 mt-1 w-72 bg-turbo-surface border border-turbo-border
                   rounded-lg shadow-2xl overflow-hidden z-50"
      >
        <div className="px-3 py-2.5 border-b border-turbo-border">
          <span className="text-xs font-medium text-turbo-text">
            {mode === 'edit-global' ? 'Set Global Identity' : `Set Identity for ${selectedProject?.name}`}
          </span>
        </div>
        <div className="px-3 py-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="w-full bg-turbo-bg border border-turbo-border rounded-md px-2.5 py-1.5 text-xs
                       text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                       focus:border-turbo-accent/50 transition-colors"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-full bg-turbo-bg border border-turbo-border rounded-md px-2.5 py-1.5 text-xs
                       text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                       focus:border-turbo-accent/50 transition-colors"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-turbo-border">
          <button
            onClick={() => setMode('view')}
            className="text-xs px-2.5 py-1 rounded-md text-turbo-text-dim hover:bg-turbo-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !email.trim()}
            className="text-xs px-2.5 py-1 rounded-md bg-turbo-accent text-white font-medium
                       hover:bg-turbo-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-1 w-72 bg-turbo-surface border border-turbo-border
                 rounded-lg shadow-2xl overflow-hidden z-50"
    >
      {/* Current identity */}
      <div className="px-3 py-2.5 border-b border-turbo-border">
        <div className="flex items-center gap-1.5 mb-1">
          {currentResolved?.source !== 'none' ? (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
          )}
          <span className="text-xs font-medium text-turbo-text">
            {currentResolved?.identity
              ? `${currentResolved.identity.name} <${currentResolved.identity.email}>`
              : 'No git identity'}
          </span>
        </div>
        <span className="text-[10px] text-turbo-text-muted">
          Source: {SOURCE_LABELS[currentResolved?.source || 'none']}
        </span>
      </div>

      {/* Actions */}
      <div className="py-1">
        <button
          onClick={() => handleStartEdit('edit-global')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-turbo-text-dim
                     hover:bg-turbo-surface-hover transition-colors text-left"
        >
          <GlobeIcon />
          Set global identity
        </button>

        {selectedProject && (
          <button
            onClick={() => handleStartEdit('edit-project')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-turbo-text-dim
                       hover:bg-turbo-surface-hover transition-colors text-left"
          >
            <FolderIcon />
            Set identity for {selectedProject.name}
          </button>
        )}

        {currentResolved?.source === 'project-override' && selectedProject && (
          <button
            onClick={handleClearProjectOverride}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/80
                       hover:bg-turbo-surface-hover transition-colors text-left"
          >
            <TrashIcon />
            Clear project override
          </button>
        )}
      </div>
    </motion.div>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}
