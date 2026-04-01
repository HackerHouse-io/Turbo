import { ipcMain, BrowserWindow, dialog, app, nativeImage } from 'electron'
import { EventEmitter } from 'events'
import { basename, extname, join } from 'path'
import { stat, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { v4 as uuid } from 'uuid'
import type {
  CreateSessionPayload,
  SessionInputPayload,
  TerminalResizePayload,
  AddProjectPayload,
  AgentSession,
  AttentionItem,
  AttachmentInfo,
  GitIdentity,
  GitCommitPayload,
  GitExecPayload,
  GitPreset,
  StartPlaybookPayload,
  PlaybookExecution,
  Playbook,
  PlanSavePayload,
  CreatePlainTerminalPayload,
  PlainTerminal,
  CreateWorktreePayload,
  CreateProjectPayload
} from '../../shared/types'
import { IPC } from '../../shared/constants'
import { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import { ProjectManager } from '../ProjectManager'
import { PromptHistoryManager } from '../PromptHistoryManager'
import { SettingsManager } from '../SettingsManager'
import { GitIdentityManager } from '../git/GitIdentityManager'
import { GitOpsManager } from '../git/GitOpsManager'
import { GitPresetManager } from '../git/GitPresetManager'
import { PlaybookManager } from '../playbooks/PlaybookManager'
import { PlaybookExecutor } from '../playbooks/PlaybookExecutor'
import { PlanFileManager } from '../plan/PlanFileManager'
import { PlainTerminalManager } from '../terminal/PlainTerminalManager'
import { WorktreeManager } from '../git/WorktreeManager'
import { GitHubManager } from '../github/GitHubManager'
import { ProjectCreationManager } from '../ProjectCreationManager'
import { detectModels } from '../claude/ClaudeModelDetector'
import { detectRunCommand, detectRunCommandWithClaude } from '../run/detectRunCommand'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.json': 'application/json',
  '.ts': 'text/typescript', '.tsx': 'text/typescript',
  '.js': 'text/javascript', '.jsx': 'text/javascript',
  '.py': 'text/x-python', '.rs': 'text/x-rust', '.go': 'text/x-go',
  '.md': 'text/markdown', '.txt': 'text/plain', '.html': 'text/html',
  '.css': 'text/css', '.yaml': 'text/yaml', '.yml': 'text/yaml',
  '.toml': 'text/toml', '.xml': 'text/xml', '.sh': 'text/x-shellscript',
  '.java': 'text/x-java', '.c': 'text/x-c', '.cpp': 'text/x-c++',
  '.h': 'text/x-c', '.rb': 'text/x-ruby', '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
}
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

interface IpcHandlerOptions {
  sessionManager: ClaudeSessionManager
  projectManager: ProjectManager
  promptHistoryManager: PromptHistoryManager
  settingsManager: SettingsManager
  gitIdentityManager: GitIdentityManager
  gitOpsManager: GitOpsManager
  gitPresetManager: GitPresetManager
  playbookManager: PlaybookManager
  playbookExecutor: PlaybookExecutor
  planFileManager: PlanFileManager
  plainTerminalManager: PlainTerminalManager
  worktreeManager: WorktreeManager
  githubManager: GitHubManager
  projectCreationManager: ProjectCreationManager
  getMainWindow: () => BrowserWindow | null
}

/**
 * Register all IPC handlers. Called once from main process init.
 */
export function registerIpcHandlers(opts: IpcHandlerOptions): void {
  const {
    sessionManager,
    projectManager,
    promptHistoryManager,
    settingsManager,
    gitIdentityManager,
    gitOpsManager,
    gitPresetManager,
    playbookManager,
    playbookExecutor,
    planFileManager,
    plainTerminalManager,
    worktreeManager,
    githubManager,
    projectCreationManager,
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
      promptHistoryManager.addHistory(payload.prompt, payload.projectPath)
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

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths
  })

  // ─── Attachments ────────────────────────────────────────────

  ipcMain.handle(IPC.ATTACHMENT_GET_FILE_INFO, async (_e, filePaths: string[]) => {
    const results = await Promise.all(filePaths.map(async (fp) => {
      try {
        const s = await stat(fp)
        if (!s.isFile()) return { error: { path: fp, error: 'Not a file' } }
        const ext = extname(fp).toLowerCase()
        return {
          file: {
            id: uuid(),
            filePath: fp,
            fileName: basename(fp),
            mimeType: MIME_MAP[ext] || 'application/octet-stream',
            sizeBytes: s.size,
            isImage: IMAGE_EXTS.has(ext)
          } as AttachmentInfo
        }
      } catch (err: unknown) {
        return { error: { path: fp, error: (err as Error).message } }
      }
    }))

    const files = results.map(r => 'file' in r ? r.file : null).filter(Boolean) as AttachmentInfo[]
    const errors = results.map(r => 'error' in r ? r.error : null).filter(Boolean) as { path: string; error: string }[]
    return { files, errors }
  })

  ipcMain.handle(IPC.ATTACHMENT_SAVE_CLIPBOARD_IMAGE, async (_e, payload: { dataUrl: string; projectPath: string }): Promise<AttachmentInfo> => {
    const match = payload.dataUrl.match(/^data:image\/([\w+.-]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URL')

    const rawType = match[1]
    const ext = rawType === 'jpeg' ? 'jpg' : rawType.replace(/\+.*$/, '')
    const mimeType = `image/${rawType}`
    const buffer = Buffer.from(match[2], 'base64')
    const dir = join(tmpdir(), 'turbo-attachments')
    await mkdir(dir, { recursive: true })

    const fileName = `clipboard-${uuid().slice(0, 8)}.${ext}`
    const filePath = join(dir, fileName)
    await writeFile(filePath, buffer)

    return {
      id: uuid(),
      filePath,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
      isImage: true
    }
  })

  const thumbnailCache = new Map<string, string | null>()

  ipcMain.handle(IPC.ATTACHMENT_GET_THUMBNAIL, async (_e, filePath: string) => {
    const cached = thumbnailCache.get(filePath)
    if (cached !== undefined) return cached

    try {
      const img = nativeImage.createFromPath(filePath)
      if (img.isEmpty()) { thumbnailCache.set(filePath, null); return null }
      const dataUrl = img.resize({ width: 80, height: 80 }).toDataURL()
      thumbnailCache.set(filePath, dataUrl)
      return dataUrl
    } catch {
      thumbnailCache.set(filePath, null)
      return null
    }
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

  ipcMain.handle(IPC.PROJECT_SET_RUN_COMMAND, async (_e, projectId: string, command: string | undefined, source?: string, sourceMtime?: number) => {
    projectManager.setRunCommand(projectId, command, source, sourceMtime)
  })

  ipcMain.handle(IPC.PROJECT_DETECT_RUN_COMMAND, async (_e, projectPath: string) => {
    // Tier 1: file-based (async for xcodebuild)
    const fileResult = await detectRunCommand(projectPath)
    if (fileResult) return fileResult

    // Tier 2: Claude AI
    const aiResult = await detectRunCommandWithClaude(projectPath)
    if (aiResult) return { ...aiResult, source: 'claude', sourceMtime: undefined }

    return null
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

  // ─── Prompt History ─────────────────────────────────────────

  ipcMain.handle(IPC.PROMPT_HISTORY_LIST, async () => {
    return promptHistoryManager.listHistory()
  })

  ipcMain.handle(IPC.PROMPT_HISTORY_CLEAR, async () => {
    promptHistoryManager.clearHistory()
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

  // ─── Playbooks ────────────────────────────────────────────────

  ipcMain.handle(IPC.PLAYBOOK_LIST, async () => {
    return playbookManager.listPlaybooks()
  })

  ipcMain.handle(IPC.PLAYBOOK_START, async (_e, payload: StartPlaybookPayload) => {
    return playbookExecutor.startPlaybook(payload)
  })

  ipcMain.handle(IPC.PLAYBOOK_PAUSE, async (_e, executionId: string) => {
    playbookExecutor.pausePlaybook(executionId)
  })

  ipcMain.handle(IPC.PLAYBOOK_RESUME, async (_e, executionId: string) => {
    playbookExecutor.resumePlaybook(executionId)
  })

  ipcMain.handle(IPC.PLAYBOOK_STOP, async (_e, executionId: string) => {
    playbookExecutor.stopPlaybook(executionId)
  })

  ipcMain.handle(IPC.PLAYBOOK_DISMISS, async (_e, executionId: string) => {
    playbookExecutor.dismissPlaybook(executionId)
  })

  ipcMain.handle(IPC.PLAYBOOK_EXECUTIONS, async () => {
    return playbookExecutor.listExecutions()
  })

  ipcMain.handle(IPC.PLAYBOOK_REMOVE, async (_e, executionId: string) => {
    playbookExecutor.removeExecution(executionId)
  })

  ipcMain.handle(IPC.PLAYBOOK_SAVE, async (_e, playbook: Playbook) => {
    return playbookManager.savePlaybook(playbook)
  })

  ipcMain.handle(IPC.PLAYBOOK_DELETE, async (_e, id: string) => {
    playbookManager.deletePlaybook(id)
  })

  ipcMain.handle(IPC.PLAYBOOK_DUPLICATE, async (_e, id: string) => {
    return playbookManager.duplicatePlaybook(id)
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

  // ─── Worktree ─────────────────────────────────────────────

  ipcMain.handle(IPC.WORKTREE_CREATE, async (_e, payload: CreateWorktreePayload) => {
    return worktreeManager.createWorktree(payload.projectPath, payload.slug)
  })

  ipcMain.handle(IPC.WORKTREE_LIST, async (_e, projectPath: string) => {
    return worktreeManager.listWorktrees(projectPath)
  })

  ipcMain.handle(IPC.WORKTREE_REBASE, async (_e, worktreePath: string) => {
    return worktreeManager.rebaseOntoMain(worktreePath)
  })

  ipcMain.handle(IPC.WORKTREE_CREATE_PR, async (_e, worktreePath: string, title: string, body: string) => {
    return worktreeManager.createPR(worktreePath, title, body)
  })

  ipcMain.handle(IPC.WORKTREE_REMOVE, async (_e, worktreePath: string, deleteBranch?: boolean) => {
    return worktreeManager.removeWorktree(worktreePath, deleteBranch)
  })

  // ─── GitHub Integration ────────────────────────────────────

  ipcMain.handle(IPC.GITHUB_SAVE_TOKEN, async (_e, pat: string) => {
    return githubManager.saveToken(pat)
  })

  ipcMain.handle(IPC.GITHUB_REMOVE_TOKEN, async () => {
    return githubManager.removeToken()
  })

  ipcMain.handle(IPC.GITHUB_CONNECTION_STATUS, async () => {
    return githubManager.getConnectionStatus()
  })

  ipcMain.handle(IPC.GITHUB_LIST_ORGS, async () => {
    return githubManager.listOrgs()
  })

  // ─── Project Creation ──────────────────────────────────────

  ipcMain.handle(IPC.PROJECT_CREATE_NEW, async (_e, payload: CreateProjectPayload) => {
    return projectCreationManager.createProject(payload)
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
  forward(playbookExecutor, 'playbook-updated', IPC.PLAYBOOK_UPDATED)
  forward(plainTerminalManager, 'terminal-data', IPC.PLAIN_TERMINAL_DATA)
  forward(plainTerminalManager, 'terminal-exit', IPC.PLAIN_TERMINAL_EXIT)
  forward(plainTerminalManager, 'terminal-created', IPC.PLAIN_TERMINAL_CREATED)
  forward(plainTerminalManager, 'terminal-removed', IPC.PLAIN_TERMINAL_REMOVED)
}
