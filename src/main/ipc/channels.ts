import { ipcMain, BrowserWindow, dialog } from 'electron'
import { basename } from 'path'
import type {
  CreateSessionPayload,
  SessionInputPayload,
  TerminalResizePayload,
  AddProjectPayload,
  AgentSession,
  AttentionItem,
  PromptTemplate
} from '../../shared/types'
import { IPC } from '../../shared/constants'
import { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import { ProjectManager } from '../ProjectManager'
import { PromptVaultManager } from '../PromptVaultManager'
import { SettingsManager } from '../SettingsManager'

/**
 * Register all IPC handlers. Called once from main process init.
 */
export function registerIpcHandlers(
  sessionManager: ClaudeSessionManager,
  projectManager: ProjectManager,
  promptVaultManager: PromptVaultManager,
  settingsManager: SettingsManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // ─── Session Lifecycle ──────────────────────────────────────

  ipcMain.handle(IPC.SESSION_CREATE, async (_e, payload: CreateSessionPayload) => {
    // Auto-register unknown project paths
    if (payload.projectPath && !projectManager.getProjectByPath(payload.projectPath)) {
      projectManager.addProject({
        name: basename(payload.projectPath),
        path: payload.projectPath
      })
    }
    // Touch the project for recency
    const project = projectManager.getProjectByPath(payload.projectPath)
    if (project) {
      projectManager.touchProject(project.id)
    }
    // Auto-save prompt to history
    if (payload.prompt) {
      promptVaultManager.addHistory(payload.prompt, payload.projectPath)
    }

    const session = await sessionManager.createSession(payload)
    return session
  })

  ipcMain.handle(IPC.SESSION_STOP, async (_e, sessionId: string) => {
    sessionManager.stopSession(sessionId)
  })

  ipcMain.handle(IPC.SESSION_LIST, async () => {
    return sessionManager.getAllSessions()
  })

  ipcMain.handle(IPC.SESSION_GET, async (_e, sessionId: string) => {
    return sessionManager.getSession(sessionId)
  })

  // ─── Terminal I/O ───────────────────────────────────────────

  ipcMain.on(IPC.TERMINAL_INPUT, (_e, sessionId: string, data: string) => {
    sessionManager.writeToSession(sessionId, data)
  })

  ipcMain.on(IPC.TERMINAL_RESIZE, (_e, payload: TerminalResizePayload) => {
    sessionManager.resizeSession(payload.sessionId, payload.cols, payload.rows)
  })

  // ─── Dialog ─────────────────────────────────────────────────

  ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ─── Projects ───────────────────────────────────────────────

  ipcMain.handle(IPC.PROJECT_LIST, async () => {
    return projectManager.listProjects()
  })

  ipcMain.handle(IPC.PROJECT_ADD, async (_e, payload: AddProjectPayload) => {
    return projectManager.addProject(payload)
  })

  ipcMain.handle(IPC.PROJECT_REMOVE, async (_e, projectId: string) => {
    projectManager.removeProject(projectId)
  })

  ipcMain.handle(IPC.PROJECTS_SCAN_DIR, async (_e, dirPath: string) => {
    return projectManager.scanDirectory(dirPath)
  })

  // ─── Settings ───────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, async (_e, key: string) => {
    return settingsManager.get(key as keyof import('../../shared/types').TurboSettings)
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: unknown) => {
    settingsManager.set(key as keyof import('../../shared/types').TurboSettings, value as any)
  })

  // ─── Prompt Vault ──────────────────────────────────────────

  ipcMain.handle(IPC.PROMPT_TEMPLATES_LIST, async () => {
    return promptVaultManager.listTemplates()
  })

  ipcMain.handle(IPC.PROMPT_TEMPLATES_SAVE, async (_e, template: PromptTemplate) => {
    return promptVaultManager.saveTemplate(template)
  })

  ipcMain.handle(IPC.PROMPT_TEMPLATES_DELETE, async (_e, templateId: string) => {
    promptVaultManager.deleteTemplate(templateId)
  })

  ipcMain.handle(IPC.PROMPT_HISTORY_LIST, async () => {
    return promptVaultManager.listHistory()
  })

  ipcMain.handle(IPC.PROMPT_HISTORY_CLEAR, async () => {
    promptVaultManager.clearHistory()
  })

  // ─── Forward events to renderer ────────────────────────────

  sessionManager.on('session-updated', (session: AgentSession) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.SESSION_UPDATED, session)
    }
  })

  sessionManager.on('terminal-data', (sessionId: string, data: string) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.TERMINAL_DATA, sessionId, data)
    }
  })

  sessionManager.on('attention-needed', (item: AttentionItem) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.ATTENTION_NEW, item)
    }
  })

  sessionManager.on('session-removed', (sessionId: string) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.SESSION_REMOVED, sessionId)
    }
  })
}
