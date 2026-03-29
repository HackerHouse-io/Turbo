import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { ClaudeSessionManager } from './claude/ClaudeSessionManager'
import { ProjectManager } from './ProjectManager'
import { PromptVaultManager } from './PromptVaultManager'
import { SettingsManager } from './SettingsManager'
import { GitIdentityManager } from './git/GitIdentityManager'
import { GitOpsManager } from './git/GitOpsManager'
import { GitPresetManager } from './git/GitPresetManager'
import { RoutineManager } from './routines/RoutineManager'
import { RoutineExecutor } from './routines/RoutineExecutor'
import { PlanFileManager } from './plan/PlanFileManager'
import { PlainTerminalManager } from './terminal/PlainTerminalManager'
import { registerIpcHandlers } from './ipc/channels'

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager
let projectManager: ProjectManager
let sessionManager: ClaudeSessionManager
let promptVaultManager: PromptVaultManager
let gitOpsManager: GitOpsManager
let gitPresetManager: GitPresetManager
let routineManager: RoutineManager
let routineExecutor: RoutineExecutor
let planFileManager: PlanFileManager
let plainTerminalManager: PlainTerminalManager

const isDev = !app.isPackaged

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
  promptVaultManager = new PromptVaultManager(app.getPath('userData'))
  gitPresetManager = new GitPresetManager(app.getPath('userData'))
  routineManager = new RoutineManager(app.getPath('userData'))
  routineExecutor = new RoutineExecutor(sessionManager, routineManager)
  planFileManager = new PlanFileManager()
  plainTerminalManager = new PlainTerminalManager()

  // Register IPC handlers
  registerIpcHandlers({
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
    getMainWindow: () => mainWindow
  })

  // Create main window
  createWindow()

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
  routineExecutor?.dispose()
  sessionManager?.dispose()
})
