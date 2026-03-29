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
  PromptHistoryItem,
  GitIdentity,
  ResolvedGitIdentity,
  GitCommandResult,
  GitWorkflowResult,
  GitAIMessageResult,
  GitCommitPayload,
  GitExecPayload,
  ClaudeModelInfo,
  GitPreset,
  Routine,
  RoutineExecution,
  StartRoutinePayload,
  PlanReadResult,
  PlanSavePayload,
  PlanSaveResult,
  PlainTerminal
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

  removeSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_REMOVE, sessionId),

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

  // ─── Claude CLI ───────────────────────────────────────────

  detectModels: (): Promise<ClaudeModelInfo[]> =>
    ipcRenderer.invoke(IPC.CLAUDE_DETECT_MODELS),

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

  // ─── Git Identity ──────────────────────────────────────────

  detectGlobalGitIdentity: (): Promise<GitIdentity | null> =>
    ipcRenderer.invoke(IPC.GIT_IDENTITY_DETECT_GLOBAL),

  detectProjectGitIdentity: (projectPath: string): Promise<GitIdentity | null> =>
    ipcRenderer.invoke(IPC.GIT_IDENTITY_DETECT_PROJECT, projectPath),

  resolveGitIdentity: (projectPath: string): Promise<ResolvedGitIdentity> =>
    ipcRenderer.invoke(IPC.GIT_IDENTITY_RESOLVE, projectPath),

  setGlobalGitIdentity: (identity: GitIdentity): Promise<void> =>
    ipcRenderer.invoke(IPC.GIT_IDENTITY_SET_GLOBAL, identity),

  setProjectGitIdentity: (projectId: string, identity: GitIdentity | undefined): Promise<void> =>
    ipcRenderer.invoke(IPC.GIT_IDENTITY_SET_PROJECT, projectId, identity),

  // ─── Git Operations ────────────────────────────────────────

  gitExec: (payload: GitExecPayload): Promise<GitWorkflowResult> =>
    ipcRenderer.invoke(IPC.GIT_EXEC, payload),

  gitStageAll: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_STAGE_ALL, projectPath),

  gitCommit: (payload: GitCommitPayload): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_COMMIT, payload),

  gitPush: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_PUSH, projectPath),

  gitPullRebase: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_PULL_REBASE, projectPath),

  gitAIMessage: (projectPath: string): Promise<GitAIMessageResult> =>
    ipcRenderer.invoke(IPC.GIT_AI_MESSAGE, projectPath),

  gitStatus: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_STATUS, projectPath),

  // ─── Git Presets ───────────────────────────────────────────

  listGitPresets: (): Promise<GitPreset[]> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_LIST),

  saveGitPreset: (preset: GitPreset): Promise<GitPreset> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_SAVE, preset),

  deleteGitPreset: (presetId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_DELETE, presetId),

  // ─── Routines ────────────────────────────────────────────

  listRoutines: (): Promise<Routine[]> =>
    ipcRenderer.invoke(IPC.ROUTINE_LIST),

  saveRoutine: (routine: Routine): Promise<Routine> =>
    ipcRenderer.invoke(IPC.ROUTINE_SAVE, routine),

  deleteRoutine: (routineId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_DELETE, routineId),

  duplicateRoutine: (routineId: string): Promise<Routine> =>
    ipcRenderer.invoke(IPC.ROUTINE_DUPLICATE, routineId),

  startRoutine: (payload: StartRoutinePayload): Promise<RoutineExecution> =>
    ipcRenderer.invoke(IPC.ROUTINE_START, payload),

  pauseRoutine: (executionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_PAUSE, executionId),

  resumeRoutine: (executionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_RESUME, executionId),

  stopRoutine: (executionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_STOP, executionId),

  dismissRoutine: (executionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_DISMISS, executionId),

  listRoutineExecutions: (): Promise<RoutineExecution[]> =>
    ipcRenderer.invoke(IPC.ROUTINE_EXECUTIONS),

  removeRoutineExecution: (executionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ROUTINE_REMOVE, executionId),

  // ─── Plan ──────────────────────────────────────────────────

  planRead: (projectPath: string): Promise<PlanReadResult> =>
    ipcRenderer.invoke(IPC.PLAN_READ, projectPath),

  planSave: (payload: PlanSavePayload): Promise<PlanSaveResult> =>
    ipcRenderer.invoke(IPC.PLAN_SAVE, payload),

  onPlanFileChanged: (callback: (result: PlanReadResult) => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: PlanReadResult) => callback(result)
    ipcRenderer.on(IPC.PLAN_FILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.PLAN_FILE_CHANGED, handler)
  },

  // ─── Plain Terminal ────────────────────────────────────────

  createPlainTerminal: (projectPath: string): Promise<PlainTerminal> =>
    ipcRenderer.invoke(IPC.PLAIN_TERMINAL_CREATE, { projectPath }),

  killPlainTerminal: (terminalId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PLAIN_TERMINAL_KILL, terminalId),

  sendPlainTerminalInput: (terminalId: string, data: string): void =>
    ipcRenderer.send(IPC.PLAIN_TERMINAL_INPUT, terminalId, data),

  resizePlainTerminal: (terminalId: string, cols: number, rows: number): void =>
    ipcRenderer.send(IPC.PLAIN_TERMINAL_RESIZE, { terminalId, cols, rows }),

  onPlainTerminalData: (callback: (terminalId: string, data: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, terminalId: string, data: string) =>
      callback(terminalId, data)
    ipcRenderer.on(IPC.PLAIN_TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.PLAIN_TERMINAL_DATA, handler)
  },

  onPlainTerminalExit: (callback: (terminalId: string, code: number) => void) => {
    const handler = (_: Electron.IpcRendererEvent, terminalId: string, code: number) =>
      callback(terminalId, code)
    ipcRenderer.on(IPC.PLAIN_TERMINAL_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.PLAIN_TERMINAL_EXIT, handler)
  },

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
  },

  onRoutineUpdated: (callback: (execution: RoutineExecution) => void) => {
    const handler = (_: Electron.IpcRendererEvent, execution: RoutineExecution) => callback(execution)
    ipcRenderer.on(IPC.ROUTINE_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC.ROUTINE_UPDATED, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

// Export the type for use in renderer
export type TurboAPI = typeof api
