import { Notification, BrowserWindow } from 'electron'
import { IPC, DEFAULT_NOTIFICATION_PREFERENCES } from '../shared/constants'
import type { AttentionItem, NotificationPreferences } from '../shared/types'
import type { SettingsManager } from './SettingsManager'

export class NotificationManager {
  private mainWindow: BrowserWindow | null = null
  private settings: SettingsManager

  constructor(settings: SettingsManager) {
    this.settings = settings
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  notify(item: AttentionItem): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    if (this.mainWindow.isFocused()) return
    if (this.settings.get('notificationsEnabled') === false) return

    // Check per-type OS notification preference
    const prefs = (this.settings.get('notificationPreferences') as NotificationPreferences | undefined)
      ?? DEFAULT_NOTIFICATION_PREFERENCES
    if (!prefs[item.type]?.osNotification) return

    const { title, body } = this.formatNotification(item)
    const soundEnabled = this.settings.get('notificationSound') ?? true
    const notification = new Notification({ title, body, silent: !soundEnabled })

    notification.on('click', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
        this.mainWindow.webContents.send(IPC.NOTIFICATION_CLICK, item.sessionId)
      }
    })

    notification.show()
  }

  private formatNotification(item: AttentionItem): { title: string; body: string } {
    switch (item.type) {
      case 'completed':
        return { title: `✓ ${item.title}`, body: 'Task completed successfully' }
      case 'decision':
        return { title: `⏸ ${item.title}`, body: item.message || 'Waiting for input' }
      case 'error':
        return { title: `✗ ${item.title}`, body: item.message || 'Task encountered an error' }
      case 'stuck':
        return { title: `⚠ ${item.title}`, body: 'Task has been idle' }
      case 'review':
        return { title: `👁 ${item.title}`, body: 'Ready for review' }
    }
  }
}
