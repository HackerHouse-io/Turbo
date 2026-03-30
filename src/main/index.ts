import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { ClaudeSessionManager } from './claude/ClaudeSessionManager'
import { ProjectManager } from './ProjectManager'
import { PromptHistoryManager } from './PromptHistoryManager'
import { SettingsManager } from './SettingsManager'
import { GitIdentityManager } from './git/GitIdentityManager'
import { GitOpsManager } from './git/GitOpsManager'
import { GitPresetManager } from './git/GitPresetManager'
import { PlaybookManager } from './playbooks/PlaybookManager'
import { PlaybookExecutor } from './playbooks/PlaybookExecutor'
import { PlanFileManager } from './plan/PlanFileManager'
import { PlainTerminalManager } from './terminal/PlainTerminalManager'
import { NotificationManager } from './NotificationManager'
import { registerIpcHandlers } from './ipc/channels'

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager
let projectManager: ProjectManager
let sessionManager: ClaudeSessionManager
let promptHistoryManager: PromptHistoryManager
let gitOpsManager: GitOpsManager
let gitPresetManager: GitPresetManager
let playbookManager: PlaybookManager
let playbookExecutor: PlaybookExecutor
let planFileManager: PlanFileManager
let plainTerminalManager: PlainTerminalManager
let notificationManager: NotificationManager

const isDev = !app.isPackaged

// Prevent EPIPE crashes when stdout/stderr pipe is closed (e.g. during dev reload)
process.stdout?.on('error', () => {})
process.stderr?.on('error', () => {})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Turbo',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Log renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    try {
      const prefix = ['LOG', 'WARN', 'ERR', 'DBG'][level] || 'LOG'
      console.log(`[RENDERER:${prefix}] ${message}`)
    } catch {
      // Ignore EPIPE errors when stdout pipe is closed
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize managers (settings + project first — session manager depends on them)
  settingsManager = new SettingsManager()
  projectManager = new ProjectManager(app.getPath('userData'))

  const gitIdentityManager = new GitIdentityManager()
  gitOpsManager = new GitOpsManager(gitIdentityManager)

  sessionManager = new ClaudeSessionManager(settingsManager, projectManager, gitOpsManager)
  promptHistoryManager = new PromptHistoryManager(app.getPath('userData'))
  gitPresetManager = new GitPresetManager(app.getPath('userData'))
  playbookManager = new PlaybookManager(app.getPath('userData'))
  playbookExecutor = new PlaybookExecutor(sessionManager, playbookManager)
  planFileManager = new PlanFileManager()
  plainTerminalManager = new PlainTerminalManager()

  // Register IPC handlers
  registerIpcHandlers({
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
    getMainWindow: () => mainWindow
  })

  notificationManager = new NotificationManager(settingsManager)

  // Create main window
  createWindow()

  // Wire up OS notifications for attention events
  if (mainWindow) {
    notificationManager.setMainWindow(mainWindow)
  }
  sessionManager.on('attention-needed', (item) => {
    notificationManager.notify(item)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  plainTerminalManager?.dispose()
  planFileManager?.dispose()
  playbookExecutor?.dispose()
  sessionManager?.dispose()
})
