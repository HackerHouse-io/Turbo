import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { ClaudeSessionManager } from './claude/ClaudeSessionManager'
import { ProjectManager } from './ProjectManager'
import { PromptVaultManager } from './PromptVaultManager'
import { SettingsManager } from './SettingsManager'
import { registerIpcHandlers } from './ipc/channels'

let mainWindow: BrowserWindow | null = null
let sessionManager: ClaudeSessionManager
let projectManager: ProjectManager
let promptVaultManager: PromptVaultManager
let settingsManager: SettingsManager

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
  // Initialize managers
  sessionManager = new ClaudeSessionManager()
  projectManager = new ProjectManager(app.getPath('userData'))
  promptVaultManager = new PromptVaultManager(app.getPath('userData'))
  settingsManager = new SettingsManager()

  // Register IPC handlers
  registerIpcHandlers(sessionManager, projectManager, promptVaultManager, settingsManager, () => mainWindow)

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
  sessionManager?.dispose()
})
