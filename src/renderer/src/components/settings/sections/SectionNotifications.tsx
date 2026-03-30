import { SettingRow, SettingSectionHeader } from '../SettingRow'
import { ToggleSwitch } from '../../shared/ToggleSwitch'

interface SectionNotificationsProps {
  notificationsEnabled: boolean
  onToggle: (v: boolean) => void
}

export function SectionNotifications({ notificationsEnabled, onToggle }: SectionNotificationsProps) {
  return (
    <div>
      <SettingSectionHeader title="Notifications" description="Control when Turbo sends system notifications" />
      <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
        <SettingRow label="OS notifications" description="Show native system notifications for session events">
          <ToggleSwitch checked={notificationsEnabled} onChange={onToggle} />
        </SettingRow>
      </div>
    </div>
  )
}
