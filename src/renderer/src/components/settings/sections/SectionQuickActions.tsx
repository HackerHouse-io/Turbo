import { SettingSectionHeader } from '../SettingRow'
import { GIT_QUICK_ACTIONS } from '../../../../../shared/constants'
import type { GitQuickActionOverride } from '../../../../../shared/types'

interface SectionQuickActionsProps {
  gitOverrides: Record<string, string>
  gitCustomActions: GitQuickActionOverride[]
  onOverridesChange: (overrides: Record<string, string>) => void
  onCustomActionsChange: (actions: GitQuickActionOverride[]) => void
}

export function SectionQuickActions({
  gitOverrides, gitCustomActions, onOverridesChange, onCustomActionsChange
}: SectionQuickActionsProps) {
  return (
    <div>
      <SettingSectionHeader title="Quick Actions" description="Customize the commands behind git quick action buttons" />

      {/* Built-in Actions */}
      <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2">Built-in Actions</p>
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        {GIT_QUICK_ACTIONS.map(a => {
          const isOverridden = !!gitOverrides[a.id]
          return (
            <div key={a.id} className="py-3 px-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-turbo-text-dim">{a.label}</span>
                {isOverridden && (
                  <button
                    onClick={() => {
                      const next = { ...gitOverrides }
                      delete next[a.id]
                      onOverridesChange(next)
                    }}
                    className="text-[10px] text-turbo-text-muted hover:text-turbo-accent transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="text"
                value={gitOverrides[a.id] ?? ''}
                placeholder={a.defaultCommand}
                onChange={e => {
                  const next = { ...gitOverrides }
                  if (e.target.value) {
                    next[a.id] = e.target.value
                  } else {
                    delete next[a.id]
                  }
                  onOverridesChange(next)
                }}
                className="w-full bg-turbo-bg border border-turbo-border rounded-lg px-2.5 py-1.5 text-xs
                           text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                           focus:border-turbo-accent/50 transition-colors font-mono"
              />
            </div>
          )
        })}
      </div>

      {/* Custom Actions */}
      <p className="text-[11px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2 mt-5">Custom Actions</p>
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        {gitCustomActions.length === 0 ? (
          <div className="py-3 px-4 text-xs text-turbo-text-muted">No custom actions yet</div>
        ) : (
          gitCustomActions.map((c, i) => (
            <div key={c.id} className="py-3 px-4 flex items-center gap-2">
              <input
                type="text"
                value={c.label}
                placeholder="Label"
                onChange={e => {
                  const next = [...gitCustomActions]
                  next[i] = { ...next[i], label: e.target.value }
                  onCustomActionsChange(next)
                }}
                className="w-36 flex-shrink-0 bg-turbo-bg border border-turbo-border rounded-lg px-2.5 py-1.5 text-xs
                           text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                           focus:border-turbo-accent/50 transition-colors"
              />
              <input
                type="text"
                value={c.command}
                placeholder="git stash"
                onChange={e => {
                  const next = [...gitCustomActions]
                  next[i] = { ...next[i], command: e.target.value }
                  onCustomActionsChange(next)
                }}
                className="flex-1 bg-turbo-bg border border-turbo-border rounded-lg px-2.5 py-1.5 text-xs
                           text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                           focus:border-turbo-accent/50 transition-colors font-mono"
              />
              <button
                onClick={() => {
                  const next = gitCustomActions.filter((_, j) => j !== i)
                  onCustomActionsChange(next)
                }}
                className="p-1 rounded hover:bg-turbo-surface-hover text-turbo-text-muted transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      <button
        onClick={() => {
          const next = [...gitCustomActions, {
            id: crypto.randomUUID(),
            label: '',
            icon: 'terminal',
            command: ''
          }]
          onCustomActionsChange(next)
        }}
        className="text-xs text-turbo-accent hover:text-turbo-accent/80 transition-colors mt-2"
      >
        + Add custom action
      </button>
    </div>
  )
}
