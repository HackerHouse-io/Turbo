import { SettingRow, SettingSectionHeader } from '../SettingRow'

interface SectionAboutProps {
  dataDir: string
}

export function SectionAbout({ dataDir }: SectionAboutProps) {
  return (
    <div>
      <SettingSectionHeader title="About" description="Application information" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="Version">
          <span className="text-sm text-turbo-text-dim">0.1.0</span>
        </SettingRow>
        <SettingRow label="Data directory">
          <span className="text-xs text-turbo-text-dim truncate max-w-[280px]" title={dataDir}>
            {dataDir}
          </span>
        </SettingRow>
      </div>
      <p className="text-[11px] text-turbo-text-muted mt-3">
        Settings are stored in settings.json
      </p>
    </div>
  )
}
