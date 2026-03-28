import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/constants'
import type {
  CreateSessionPayload,
  SessionInputPayload,
  TerminalResizePayload,
  AddProjectPayload,
  AgentSession,
  AttentionItem,
  Project,
  ScannedProject,
  PromptTemplate,
  PromptHistoryItem
} from '../shared/types'

/**
 * Typed API exposed to the renderer via contextBridge.
 * Renderer accesses these via `window.api.*`
 */
const api = {
  // ─── Session Management ───────────────────────────────────

  createSession: (payload: CreateSessionPayload): Promise<AgentSession> =>
    ipcRenderer.invoke(IPC.SESSION_CREATE, payload),

  stopSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_STOP, sessionId),

  listSessions: (): Promise<AgentSession[]> =>
    ipcRenderer.invoke(IPC.SESSION_LIST),

  getSession: (sessionId: string): Promise<AgentSession | undefined> =>
    ipcRenderer.invoke(IPC.SESSION_GET, sessionId),

  // ─── Terminal I/O ─────────────────────────────────────────

  sendTerminalInput: (sessionId: string, data: string): void =>
    ipcRenderer.send(IPC.TERMINAL_INPUT, sessionId, data),

  resizeTerminal: (sessionId: string, cols: number, rows: number): void =>
    ipcRenderer.send(IPC.TERMINAL_RESIZE, { sessionId, cols, rows }),

  // ─── Dialog ───────────────────────────────────────────────

  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),

  // ─── Project Management ───────────────────────────────────

  listProjects: (): Promise<Project[]> =>
    ipcRenderer.invoke(IPC.PROJECT_LIST),

  addProject: (payload: AddProjectPayload): Promise<Project> =>
    ipcRenderer.invoke(IPC.PROJECT_ADD, payload),

  removeProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROJECT_REMOVE, projectId),

  scanProjectsDir: (dirPath: string): Promise<ScannedProject[]> =>
    ipcRenderer.invoke(IPC.PROJECTS_SCAN_DIR, dirPath),

  // ─── Settings ─────────────────────────────────────────────

  getSetting: (key: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET, key),

  setSetting: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  // ─── Prompt Vault ───────────────────────────────────────────

  listPromptTemplates: (): Promise<PromptTemplate[]> =>
    ipcRenderer.invoke(IPC.PROMPT_TEMPLATES_LIST),

  savePromptTemplate: (template: PromptTemplate): Promise<PromptTemplate> =>
    ipcRenderer.invoke(IPC.PROMPT_TEMPLATES_SAVE, template),

  deletePromptTemplate: (templateId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROMPT_TEMPLATES_DELETE, templateId),

  listPromptHistory: (): Promise<PromptHistoryItem[]> =>
    ipcRenderer.invoke(IPC.PROMPT_HISTORY_LIST),

  clearPromptHistory: (): Promise<void> =>
    ipcRenderer.invoke(IPC.PROMPT_HISTORY_CLEAR),

  // ─── Event Subscriptions ──────────────────────────────────

  onSessionUpdated: (callback: (session: AgentSession) => void) => {
    const handler = (_: Electron.IpcRendererEvent, session: AgentSession) => callback(session)
    ipcRenderer.on(IPC.SESSION_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_UPDATED, handler)
  },

  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string, data: string) =>
      callback(sessionId, data)
    ipcRenderer.on(IPC.TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_DATA, handler)
  },

  onAttentionNeeded: (callback: (item: AttentionItem) => void) => {
    const handler = (_: Electron.IpcRendererEvent, item: AttentionItem) => callback(item)
    ipcRenderer.on(IPC.ATTENTION_NEW, handler)
    return () => ipcRenderer.removeListener(IPC.ATTENTION_NEW, handler)
  },

  onSessionRemoved: (callback: (sessionId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string) => callback(sessionId)
    ipcRenderer.on(IPC.SESSION_REMOVED, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_REMOVED, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

// Export the type for use in renderer
export type TurboAPI = typeof api
