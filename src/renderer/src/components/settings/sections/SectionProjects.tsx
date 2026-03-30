import { SettingRow, SettingSectionHeader } from '../SettingRow'

interface SectionProjectsProps {
  projectsDir: string
  onDirChange: (dir: string) => void
  onBrowse: () => void
  onBlurSave: () => void
}

export function SectionProjects({ projectsDir, onDirChange, onBrowse, onBlurSave }: SectionProjectsProps) {
  return (
    <div>
      <SettingSectionHeader title="Projects" description="Configure where Turbo looks for projects" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="Default projects directory" vertical>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectsDir}
              onChange={e => onDirChange(e.target.value)}
              onBlur={onBlurSave}
              placeholder="/Users/you/projects"
              className="flex-1 bg-turbo-bg border border-turbo-border rounded-lg px-3 py-2 text-sm
                         text-turbo-text placeholder:text-turbo-text-muted focus:outline-none
                         focus:border-turbo-accent/50 transition-colors"
            />
            <button
              onClick={onBrowse}
              className="h-[38px] px-3 rounded-lg border border-turbo-border text-xs font-medium
                         text-turbo-text-dim hover:border-turbo-border-bright hover:text-turbo-text
                         transition-colors"
            >
              Browse
            </button>
          </div>
        </SettingRow>
      </div>
    </div>
  )
}
