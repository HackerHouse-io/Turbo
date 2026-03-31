import { SettingRow, SettingSectionHeader } from '../SettingRow'
import { ToggleSwitch } from '../../shared/ToggleSwitch'
import type { AttentionType, NotificationPreferences } from '../../../../../shared/types'
import { DEFAULT_NOTIFICATION_PREFERENCES, ATTENTION_TYPE_COLORS, ATTENTION_TYPE_LABELS } from '../../../../../shared/constants'

const TYPE_ENTRIES: AttentionType[] = ['completed', 'decision', 'error', 'stuck', 'review']

interface SectionNotificationsProps {
  notificationsEnabled: boolean
  notificationSound: boolean
  notificationPreferences: NotificationPreferences
  onToggle: (v: boolean) => void
  onSoundToggle: (v: boolean) => void
  onPreferencesChange: (prefs: NotificationPreferences) => void
}

export function SectionNotifications({
  notificationsEnabled,
  notificationSound,
  notificationPreferences,
  onToggle,
  onSoundToggle,
  onPreferencesChange
}: SectionNotificationsProps) {
  const prefs = notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES

  const updatePref = (type: AttentionType, field: 'osNotification' | 'inAppToast', value: boolean) => {
    onPreferencesChange({
      ...prefs,
      [type]: { ...prefs[type], [field]: value }
    })
  }

  return (
    <div className="space-y-6">
      {/* Master toggles */}
      <div>
        <SettingSectionHeader title="Notifications" description="Control when Turbo sends notifications" />
        <div className="rounded-lg border border-turbo-border bg-turbo-bg/50 divide-y divide-turbo-border">
          <SettingRow label="Enable notifications" description="Master toggle for all notifications">
            <ToggleSwitch checked={notificationsEnabled} onChange={onToggle} />
          </SettingRow>
          <SettingRow label="Notification sound" description="Play a sound with OS notifications">
            <ToggleSwitch checked={notificationSound} onChange={onSoundToggle} />
          </SettingRow>
        </div>
      </div>

      {/* Per-type settings */}
      {notificationsEnabled && (
        <div>
          <SettingSectionHeader title="Event Types" description="Choose which channels each event type uses" />
          <div className="rounded-lg border border-turbo-border bg-turbo-bg/50">
            {/* Table header */}
            <div className="px-4 py-2 flex items-center gap-4 text-[11px] text-turbo-text-muted border-b border-turbo-border">
              <span className="flex-1">Event</span>
              <span className="w-12 text-center">OS</span>
              <span className="w-12 text-center">In-App</span>
            </div>

            <div className="divide-y divide-turbo-border">
              {TYPE_ENTRIES.map(type => (
                <div key={type} className="px-4 py-2.5 flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ATTENTION_TYPE_COLORS[type]}`} />
                    <span className="text-sm text-turbo-text-dim">{ATTENTION_TYPE_LABELS[type]}</span>
                  </div>
                  <div className="w-12 flex justify-center">
                    <ToggleSwitch
                      checked={prefs[type]?.osNotification ?? true}
                      onChange={v => updatePref(type, 'osNotification', v)}
                    />
                  </div>
                  <div className="w-12 flex justify-center">
                    <ToggleSwitch
                      checked={prefs[type]?.inAppToast ?? true}
                      onChange={v => updatePref(type, 'inAppToast', v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
