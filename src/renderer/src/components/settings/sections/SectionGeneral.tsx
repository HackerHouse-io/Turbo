import { SettingRow, SettingSectionHeader } from '../SettingRow'
import { ToggleSwitch } from '../../shared/ToggleSwitch'
import { EFFORT_LEVELS, PERMISSION_MODES } from '../../../../../shared/constants'
import type { ClaudeModelInfo, EffortLevel, PermissionMode } from '../../../../../shared/types'

interface SectionGeneralProps {
  models: ClaudeModelInfo[]
  defaultModel: string
  defaultEffort: EffortLevel
  defaultPermissionMode: PermissionMode
  playbookAutoApprove: boolean
  onModelChange: (v: string) => void
  onEffortChange: (v: EffortLevel) => void
  onPermissionChange: (v: PermissionMode) => void
  onAutoApproveChange: (v: boolean) => void
}

export function SectionGeneral({
  models, defaultModel, defaultEffort, defaultPermissionMode, playbookAutoApprove,
  onModelChange, onEffortChange, onPermissionChange, onAutoApproveChange
}: SectionGeneralProps) {
  return (
    <div className="space-y-6">
      <SettingSectionHeader title="General" description="Default settings for new Claude sessions" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="Model" description="Default model for new sessions">
          <div className="relative">
            <select
              value={defaultModel}
              onChange={e => onModelChange(e.target.value)}
              className="h-8 px-3 pr-7 rounded-lg border border-turbo-border bg-turbo-bg text-sm
                         text-turbo-text appearance-none cursor-pointer
                         hover:border-turbo-border-bright focus:outline-none focus:border-turbo-accent/50
                         transition-colors"
            >
              <option value="">Auto-detect</option>
              {models.map(m => (
                <option key={m.alias} value={m.alias}>{m.label}</option>
              ))}
            </select>
            <svg className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-turbo-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </SettingRow>

        <SettingRow label="Effort">
          <div className="h-8 flex items-center rounded-lg border border-turbo-border overflow-hidden">
            {EFFORT_LEVELS.map(e => (
              <button
                key={e.value}
                onClick={() => onEffortChange(e.value)}
                className={`h-full px-3 text-xs font-medium transition-colors ${
                  defaultEffort === e.value
                    ? 'bg-turbo-accent/20 text-turbo-accent'
                    : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Permission mode">
          <div className="h-8 flex items-center rounded-lg border border-turbo-border overflow-hidden">
            {PERMISSION_MODES.map(p => (
              <button
                key={p.value}
                onClick={() => onPermissionChange(p.value)}
                className={`h-full px-3 text-xs font-medium transition-colors ${
                  defaultPermissionMode === p.value
                    ? 'bg-turbo-accent/20 text-turbo-accent'
                    : 'text-turbo-text-muted hover:bg-turbo-surface-hover'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>

      {/* Playbooks */}
      <div>
        <SettingSectionHeader title="Playbooks" description="Settings for playbook execution" />
        <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
          <SettingRow label="Auto-approve permissions" description="Run all playbook steps with automatic tool approval (plan steps still pause for review)">
            <ToggleSwitch checked={playbookAutoApprove} onChange={onAutoApproveChange} />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}
