import { create } from 'zustand'
import type { AttentionItem, NotificationPreferences } from '../../../shared/types'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../../shared/constants'

export interface ToastItem {
  id: string
  attentionItem: AttentionItem
  createdAt: number
}

const MAX_VISIBLE_TOASTS = 3

interface NotificationState {
  toasts: ToastItem[]
  preferences: NotificationPreferences
  masterEnabled: boolean

  showToast: (item: AttentionItem) => void
  dismissToast: (id: string) => void
  loadSettings: () => Promise<void>
  setMasterEnabled: (enabled: boolean) => void
  setPreferences: (prefs: NotificationPreferences) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  masterEnabled: true,

  showToast: (item) => {
    const { masterEnabled, preferences, toasts } = get()
    if (!masterEnabled) return
    if (!preferences[item.type]?.inAppToast) return

    const toast: ToastItem = {
      id: item.id,
      attentionItem: item,
      createdAt: Date.now()
    }

    // Keep max visible toasts, newest first
    const next = [toast, ...toasts].slice(0, MAX_VISIBLE_TOASTS)
    set({ toasts: next })
  },

  dismissToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  loadSettings: async () => {
    const [enabled, prefs] = await Promise.all([
      window.api.getSetting('notificationsEnabled'),
      window.api.getSetting('notificationPreferences')
    ])
    set({
      masterEnabled: enabled !== false,
      preferences: (prefs as NotificationPreferences | undefined) ?? DEFAULT_NOTIFICATION_PREFERENCES
    })
  },

  setMasterEnabled: (enabled) => set({ masterEnabled: enabled }),
  setPreferences: (prefs) => set({ preferences: prefs })
}))
