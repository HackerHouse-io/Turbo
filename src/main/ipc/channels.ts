import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import { EventEmitter } from 'events'
import { basename } from 'path'
import type {
  CreateSessionPayload,
  SessionInputPayload,
  TerminalResizePayload,
  AddProjectPayload,
  AgentSession,
  AttentionItem,
  PromptTemplate,
  GitIdentity,
  GitCommitPayload,
  GitExecPayload,
  GitPreset,
  StartRoutinePayload,
  RoutineExecution,
  Routine,
  PlanSavePayload,
  CreatePlainTerminalPayload,
  PlainTerminal
} from '../../shared/types'
import { IPC } from '../../shared/constants'
import { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import { ProjectManager } from '../ProjectManager'
import { PromptVaultManager } from '../PromptVaultManager'
import { SettingsManager } from '../SettingsManager'
import { GitIdentityManager } from '../git/GitIdentityManager'
import { GitOpsManager } from '../git/GitOpsManager'
import { GitPresetManager } from '../git/GitPresetManager'
import { RoutineManager } from '../routines/RoutineManager'
import { RoutineExecutor } from '../routines/RoutineExecutor'
import { PlanFileManager } from '../plan/PlanFileManager'
import { PlainTerminalManager } from '../terminal/PlainTerminalManager'
import { detectModels } from '../claude/ClaudeModelDetector'

interface IpcHandlerOptions {
  sessionManager: ClaudeSessionManager
  projectManager: ProjectManager
  promptVaultManager: PromptVaultManager
  settingsManager: SettingsManager
  gitIdentityManager: GitIdentityManager
  gitOpsManager: GitOpsManager
  gitPresetManager: GitPresetManager
  routineManager: RoutineManager
  routineExecutor: RoutineExecutor
  planFileManager: PlanFileManager
  plainTerminalManager: PlainTerminalManager
  getMainWindow: () => BrowserWindow | null
}

/**
 * Register all IPC handlers. Called once from main process init.
 */
export function registerIpcHandlers(opts: IpcHandlerOptions): void {
  const {
    sessionManager,
    projectManager,
    promptVaultManager,
    settingsManager,
    gitIdentityManager,
    gitOpsManager,
    gitPresetManager,
    routineManager,
    routineExecutor,
    planFileManager,
    plainTerminalManager,
    getMainWindow
  } = opts

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

  ipcMain.handle(IPC.SESSION_REMOVE, async (_e, sessionId: string) => {
    sessionManager.removeSession(sessionId)
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

  // ─── Claude CLI ─────────────────────────────────────────────

  ipcMain.handle(IPC.CLAUDE_DETECT_MODELS, async () => {
    return detectModels()
  })

  // ─── Settings ───────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, async (_e, key: string) => {
    return settingsManager.get(key as keyof import('../../shared/types').TurboSettings)
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: unknown) => {
    settingsManager.set(key as keyof import('../../shared/types').TurboSettings, value as any)
  })

  // ─── App ────────────────────────────────────────────────────

  ipcMain.handle(IPC.APP_GET_PATH, async (_e, name: string) => {
    return app.getPath(name as any)
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

  // ─── Git Identity ──────────────────────────────────────────

  ipcMain.handle(IPC.GIT_IDENTITY_DETECT_GLOBAL, async () => {
    return await gitIdentityManager.detectGlobalIdentity()
  })

  ipcMain.handle(IPC.GIT_IDENTITY_DETECT_PROJECT, async (_e, projectPath: string) => {
    return await gitIdentityManager.detectProjectIdentity(projectPath)
  })

  ipcMain.handle(IPC.GIT_IDENTITY_RESOLVE, async (_e, projectPath: string) => {
    const project = projectManager.getProjectByPath(projectPath)
    const globalOverride = settingsManager.get('gitIdentityGlobal') as GitIdentity | undefined
    return await gitIdentityManager.resolveIdentity(projectPath, project?.gitIdentityOverride, globalOverride)
  })

  ipcMain.handle(IPC.GIT_IDENTITY_SET_GLOBAL, async (_e, identity: GitIdentity) => {
    settingsManager.set('gitIdentityGlobal', identity)
  })

  ipcMain.handle(IPC.GIT_IDENTITY_SET_PROJECT, async (_e, projectId: string, identity: GitIdentity | undefined) => {
    projectManager.setGitIdentityOverride(projectId, identity)
  })

  // ─── Git Operations ────────────────────────────────────────

  // Shared helper — resolves identity for a project path
  async function resolveIdentityFor(projectPath: string) {
    const project = projectManager.getProjectByPath(projectPath)
    const globalOverride = settingsManager.get('gitIdentityGlobal') as GitIdentity | undefined
    const resolved = await gitIdentityManager.resolveIdentity(projectPath, project?.gitIdentityOverride, globalOverride)
    return resolved.identity
  }

  ipcMain.handle(IPC.GIT_EXEC, async (_e, payload: GitExecPayload) => {
    const identity = await resolveIdentityFor(payload.projectPath)
    return gitOpsManager.runCommands(payload.projectPath, payload.commands, identity)
  })

  ipcMain.handle(IPC.GIT_STAGE_ALL, async (_e, projectPath: string) => {
    return gitOpsManager.stageAll(projectPath)
  })

  ipcMain.handle(IPC.GIT_COMMIT, async (_e, payload: GitCommitPayload) => {
    const identity = await resolveIdentityFor(payload.projectPath)
    return gitOpsManager.commit(payload.projectPath, payload.message, identity)
  })

  ipcMain.handle(IPC.GIT_PUSH, async (_e, projectPath: string) => {
    const identity = await resolveIdentityFor(projectPath)
    return gitOpsManager.push(projectPath, identity)
  })

  ipcMain.handle(IPC.GIT_PULL_REBASE, async (_e, projectPath: string) => {
    const identity = await resolveIdentityFor(projectPath)
    return gitOpsManager.pullRebase(projectPath, identity)
  })

  ipcMain.handle(IPC.GIT_AI_MESSAGE, async (_e, projectPath: string) => {
    const identity = await resolveIdentityFor(projectPath)
    return gitOpsManager.generateAICommitMessage(projectPath, identity)
  })

  ipcMain.handle(IPC.GIT_STATUS, async (_e, projectPath: string) => {
    return gitOpsManager.getStatus(projectPath)
  })

  // ─── Git Presets ───────────────────────────────────────────

  ipcMain.handle(IPC.GIT_PRESETS_LIST, async () => {
    return gitPresetManager.listPresets()
  })

  ipcMain.handle(IPC.GIT_PRESETS_SAVE, async (_e, preset: GitPreset) => {
    return gitPresetManager.savePreset(preset)
  })

  ipcMain.handle(IPC.GIT_PRESETS_DELETE, async (_e, presetId: string) => {
    gitPresetManager.deletePreset(presetId)
  })

  // ─── Routines ────────────────────────────────────────────────

  ipcMain.handle(IPC.ROUTINE_LIST, async () => {
    return routineManager.listRoutines()
  })

  ipcMain.handle(IPC.ROUTINE_START, async (_e, payload: StartRoutinePayload) => {
    return routineExecutor.startRoutine(payload)
  })

  ipcMain.handle(IPC.ROUTINE_PAUSE, async (_e, executionId: string) => {
    routineExecutor.pauseRoutine(executionId)
  })

  ipcMain.handle(IPC.ROUTINE_RESUME, async (_e, executionId: string) => {
    routineExecutor.resumeRoutine(executionId)
  })

  ipcMain.handle(IPC.ROUTINE_STOP, async (_e, executionId: string) => {
    routineExecutor.stopRoutine(executionId)
  })

  ipcMain.handle(IPC.ROUTINE_DISMISS, async (_e, executionId: string) => {
    routineExecutor.dismissRoutine(executionId)
  })

  ipcMain.handle(IPC.ROUTINE_EXECUTIONS, async () => {
    return routineExecutor.listExecutions()
  })

  ipcMain.handle(IPC.ROUTINE_REMOVE, async (_e, executionId: string) => {
    routineExecutor.removeExecution(executionId)
  })

  ipcMain.handle(IPC.ROUTINE_SAVE, async (_e, routine: Routine) => {
    return routineManager.saveRoutine(routine)
  })

  ipcMain.handle(IPC.ROUTINE_DELETE, async (_e, id: string) => {
    routineManager.deleteRoutine(id)
  })

  ipcMain.handle(IPC.ROUTINE_DUPLICATE, async (_e, id: string) => {
    return routineManager.duplicateRoutine(id)
  })

  // ─── Plan ─────────────────────────────────────────────────

  ipcMain.handle(IPC.PLAN_READ, async (_e, projectPath: string) => {
    const result = planFileManager.readPlan(projectPath)
    // Start watching if found
    if (result.found && result.filePath) {
      const watchPath = result.filePath
      planFileManager.watchFile(watchPath, () => {
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          const updated = planFileManager.readPlan(projectPath)
          win.webContents.send(IPC.PLAN_FILE_CHANGED, updated)
        }
      })
    }
    return result
  })

  ipcMain.handle(IPC.PLAN_SAVE, async (_e, payload: PlanSavePayload) => {
    return planFileManager.savePlan(payload)
  })

  // ─── Plain Terminal ──────────────────────────────────────────

  ipcMain.handle(IPC.PLAIN_TERMINAL_CREATE, async (_e, payload: CreatePlainTerminalPayload) => {
    let env: Record<string, string> | undefined
    if (payload.type === 'claude') {
      const project = projectManager.getProjectByPath(payload.projectPath)
      const globalOverride = settingsManager.get('gitIdentityGlobal') as GitIdentity | undefined
      const resolved = await gitIdentityManager.resolveIdentity(
        payload.projectPath, project?.gitIdentityOverride, globalOverride
      )
      if (resolved.identity) {
        env = gitIdentityManager.buildGitEnv(resolved.identity)
      }
    }
    return plainTerminalManager.create(payload.projectPath, payload.type, env)
  })

  ipcMain.handle(IPC.PLAIN_TERMINAL_LIST, async () => {
    return plainTerminalManager.list()
  })

  ipcMain.handle(IPC.PLAIN_TERMINAL_KILL, async (_e, terminalId: string) => {
    plainTerminalManager.kill(terminalId)
  })

  ipcMain.on(IPC.PLAIN_TERMINAL_INPUT, (_e, terminalId: string, data: string) => {
    plainTerminalManager.write(terminalId, data)
  })

  ipcMain.on(IPC.PLAIN_TERMINAL_RESIZE, (_e, payload: { terminalId: string; cols: number; rows: number }) => {
    plainTerminalManager.resize(payload.terminalId, payload.cols, payload.rows)
  })

  // ─── Forward events to renderer ────────────────────────────

  function forward(emitter: EventEmitter, event: string, channel: string): void {
    emitter.on(event, (...args: unknown[]) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  forward(sessionManager, 'session-updated', IPC.SESSION_UPDATED)
  forward(sessionManager, 'terminal-data', IPC.TERMINAL_DATA)
  forward(sessionManager, 'attention-needed', IPC.ATTENTION_NEW)
  forward(sessionManager, 'session-removed', IPC.SESSION_REMOVED)
  forward(routineExecutor, 'routine-updated', IPC.ROUTINE_UPDATED)
  forward(plainTerminalManager, 'terminal-data', IPC.PLAIN_TERMINAL_DATA)
  forward(plainTerminalManager, 'terminal-exit', IPC.PLAIN_TERMINAL_EXIT)
  forward(plainTerminalManager, 'terminal-created', IPC.PLAIN_TERMINAL_CREATED)
  forward(plainTerminalManager, 'terminal-removed', IPC.PLAIN_TERMINAL_REMOVED)
}
