import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC } from '../shared/constants'
import type {
  CreateSessionPayload,
  SessionInputPayload,
  TerminalResizePayload,
  AddProjectPayload,
  AgentSession,
  AttentionItem,
  AttachmentInfo,
  Project,
  ScannedProject,
  PromptHistoryItem,
  GitIdentity,
  ResolvedGitIdentity,
  GitCommandResult,
  GitWorkflowResult,
  GitAIMessageResult,
  GitCommitPayload,
  GitExecPayload,
  ClaudeModelInfo,
  ClaudeInstallStatus,
  ClaudeUpdateStatus,
  GitPreset,
  PlanReadResult,
  PlanSavePayload,
  PlanSaveResult,
  PlainTerminal,
  CreatePlainTerminalPayload,
  WorktreeInfo,
  RebaseResult,
  PRResult,
  CreateWorktreePayload,
  GitHubConnectionStatus,
  GitHubTokenValidation,
  GitHubOrg,
  CreateProjectPayload,
  CreateProjectResult,
  XcodeProjectInfo
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

  resumeSession: (sessionId: string): Promise<AgentSession | null> =>
    ipcRenderer.invoke(IPC.SESSION_RESUME, sessionId),

  removeSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SESSION_REMOVE, sessionId),

  listSessions: (): Promise<AgentSession[]> =>
    ipcRenderer.invoke(IPC.SESSION_LIST),

  getSession: (sessionId: string): Promise<AgentSession | undefined> =>
    ipcRenderer.invoke(IPC.SESSION_GET, sessionId),

  // ─── Terminal I/O ─────────────────────────────────────────

  readTerminalBuffer: (sessionId: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.TERMINAL_BUFFER_READ, sessionId),

  sendTerminalInput: (sessionId: string, data: string): void =>
    ipcRenderer.send(IPC.TERMINAL_INPUT, sessionId, data),

  resizeTerminal: (sessionId: string, cols: number, rows: number): void =>
    ipcRenderer.send(IPC.TERMINAL_RESIZE, { sessionId, cols, rows }),

  // ─── Dialog ───────────────────────────────────────────────

  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),

  openFileDialog: (): Promise<string[] | null> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE),

  // ─── Attachments ─────────────────────────────────────────

  getFileInfo: (filePaths: string[]): Promise<{ files: AttachmentInfo[]; errors: { path: string; error: string }[] }> =>
    ipcRenderer.invoke(IPC.ATTACHMENT_GET_FILE_INFO, filePaths),

  saveClipboardImage: (dataUrl: string, projectPath: string): Promise<AttachmentInfo> =>
    ipcRenderer.invoke(IPC.ATTACHMENT_SAVE_CLIPBOARD_IMAGE, { dataUrl, projectPath }),

  getThumbnail: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.ATTACHMENT_GET_THUMBNAIL, filePath),

  // ─── Project Management ───────────────────────────────────

  listProjects: (): Promise<Project[]> =>
    ipcRenderer.invoke(IPC.PROJECT_LIST),

  addProject: (payload: AddProjectPayload): Promise<Project> =>
    ipcRenderer.invoke(IPC.PROJECT_ADD, payload),

  removeProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROJECT_REMOVE, projectId),

  scanProjectsDir: (dirPath: string): Promise<ScannedProject[]> =>
    ipcRenderer.invoke(IPC.PROJECTS_SCAN_DIR, dirPath),

  setProjectRunCommand: (projectId: string, command: string | undefined, source?: string, sourceMtime?: number): Promise<void> =>
    ipcRenderer.invoke(IPC.PROJECT_SET_RUN_COMMAND, projectId, command, source, sourceMtime),

  detectRunCommand: (projectPath: string): Promise<{ command: string; source: string; sourceMtime?: number } | null> =>
    ipcRenderer.invoke(IPC.PROJECT_DETECT_RUN_COMMAND, projectPath),

  getOrDetectRunCommand: (projectPath: string): Promise<{ command: string; source: string; cached: boolean } | null> =>
    ipcRenderer.invoke(IPC.PROJECT_GET_OR_DETECT_RUN_COMMAND, projectPath),

  // ─── Claude CLI ───────────────────────────────────────────

  detectModels: (): Promise<ClaudeModelInfo[]> =>
    ipcRenderer.invoke(IPC.CLAUDE_DETECT_MODELS),

  generateSlug: (text: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.CLAUDE_GENERATE_SLUG, text),

  generateSessionTitle: (prompt: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.CLAUDE_GENERATE_SESSION_TITLE, prompt),

  checkClaudeInstalled: (): Promise<ClaudeInstallStatus> =>
    ipcRenderer.invoke(IPC.CLAUDE_CHECK_INSTALL),

  recheckClaudeInstalled: (): Promise<ClaudeInstallStatus> =>
    ipcRenderer.invoke(IPC.CLAUDE_RECHECK_INSTALL),

  checkClaudeUpdates: (): Promise<ClaudeUpdateStatus> =>
    ipcRenderer.invoke(IPC.CLAUDE_CHECK_UPDATES),

  // ─── Settings ─────────────────────────────────────────────

  getSetting: (key: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET, key),

  setSetting: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  getAppPath: (name: string): Promise<string> =>
    ipcRenderer.invoke(IPC.APP_GET_PATH, name),

  // ─── Prompt History ───────────────────────────────────────

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

  // ─── Git Ship It Pipeline ────────────────────────────────

  gitGetBranch: (projectPath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.GIT_GET_BRANCH, projectPath),

  gitPushUpstream: (projectPath: string, branch: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_PUSH_UPSTREAM, projectPath, branch),

  gitFetchOrigin: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_FETCH_ORIGIN, projectPath),

  gitMergeMain: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_MERGE_MAIN, projectPath),

  gitConflictFiles: (projectPath: string): Promise<string[]> =>
    ipcRenderer.invoke(IPC.GIT_CONFLICT_FILES, projectPath),

  gitAbortMerge: (projectPath: string): Promise<GitCommandResult> =>
    ipcRenderer.invoke(IPC.GIT_ABORT_MERGE, projectPath),

  gitAIPRDescription: (projectPath: string, defaultBranch?: string): Promise<{ title: string; body: string }> =>
    ipcRenderer.invoke(IPC.GIT_AI_PR_DESCRIPTION, projectPath, defaultBranch),

  gitCreatePR: (projectPath: string, title: string, body: string, defaultBranch?: string): Promise<PRResult> =>
    ipcRenderer.invoke(IPC.GIT_CREATE_PR, projectPath, title, body, defaultBranch),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),

  // ─── Git Presets ───────────────────────────────────────────

  listGitPresets: (): Promise<GitPreset[]> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_LIST),

  saveGitPreset: (preset: GitPreset): Promise<GitPreset> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_SAVE, preset),

  deleteGitPreset: (presetId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.GIT_PRESETS_DELETE, presetId),

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

  createPlainTerminal: (payload: CreatePlainTerminalPayload): Promise<PlainTerminal> =>
    ipcRenderer.invoke(IPC.PLAIN_TERMINAL_CREATE, payload),

  listPlainTerminals: (): Promise<PlainTerminal[]> =>
    ipcRenderer.invoke(IPC.PLAIN_TERMINAL_LIST),

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

  onPlainTerminalCreated: (callback: (terminal: PlainTerminal) => void) => {
    const handler = (_: Electron.IpcRendererEvent, terminal: PlainTerminal) =>
      callback(terminal)
    ipcRenderer.on(IPC.PLAIN_TERMINAL_CREATED, handler)
    return () => ipcRenderer.removeListener(IPC.PLAIN_TERMINAL_CREATED, handler)
  },

  onPlainTerminalRemoved: (callback: (terminalId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, terminalId: string) =>
      callback(terminalId)
    ipcRenderer.on(IPC.PLAIN_TERMINAL_REMOVED, handler)
    return () => ipcRenderer.removeListener(IPC.PLAIN_TERMINAL_REMOVED, handler)
  },

  // ─── GitHub Integration ───────────────────────────────────

  githubSaveToken: (pat: string): Promise<GitHubTokenValidation> =>
    ipcRenderer.invoke(IPC.GITHUB_SAVE_TOKEN, pat),

  githubRemoveToken: (): Promise<void> =>
    ipcRenderer.invoke(IPC.GITHUB_REMOVE_TOKEN),

  githubConnectionStatus: (): Promise<GitHubConnectionStatus> =>
    ipcRenderer.invoke(IPC.GITHUB_CONNECTION_STATUS),

  githubListOrgs: (): Promise<GitHubOrg[]> =>
    ipcRenderer.invoke(IPC.GITHUB_LIST_ORGS),

  // ─── Project Creation ────────────────────────────────────

  createNewProject: (payload: CreateProjectPayload): Promise<CreateProjectResult> =>
    ipcRenderer.invoke(IPC.PROJECT_CREATE_NEW, payload),

  // ─── Xcode ─────────────────────────────────────────────────

  detectXcodeProject: (projectPath: string): Promise<XcodeProjectInfo | null> =>
    ipcRenderer.invoke(IPC.XCODE_DETECT_PROJECT, projectPath),

  openInXcode: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.XCODE_OPEN_PROJECT, filePath),

  // ─── Worktree ────────────────────────────────────────────

  createWorktree: (payload: CreateWorktreePayload): Promise<WorktreeInfo> =>
    ipcRenderer.invoke(IPC.WORKTREE_CREATE, payload),

  listWorktrees: (projectPath: string): Promise<WorktreeInfo[]> =>
    ipcRenderer.invoke(IPC.WORKTREE_LIST, projectPath),

  rebaseWorktree: (worktreePath: string): Promise<RebaseResult> =>
    ipcRenderer.invoke(IPC.WORKTREE_REBASE, worktreePath),

  createWorktreePR: (worktreePath: string, title: string, body: string): Promise<PRResult> =>
    ipcRenderer.invoke(IPC.WORKTREE_CREATE_PR, worktreePath, title, body),

  removeWorktree: (worktreePath: string, deleteBranch?: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.WORKTREE_REMOVE, worktreePath, deleteBranch),

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

  onTerminalClear: (callback: (sessionId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string) =>
      callback(sessionId)
    ipcRenderer.on(IPC.TERMINAL_CLEAR, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_CLEAR, handler)
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

  onNotificationClick: (callback: (sessionId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, sessionId: string) => callback(sessionId)
    ipcRenderer.on(IPC.NOTIFICATION_CLICK, handler)
    return () => ipcRenderer.removeListener(IPC.NOTIFICATION_CLICK, handler)
  },

  // ─── File Utilities ───────────────────────────────────────

  getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)

// Export the type for use in renderer
export type TurboAPI = typeof api
