// IPC Channel names — single source of truth
export const IPC = {
  // Session lifecycle
  SESSION_CREATE: 'session:create',
  SESSION_STOP: 'session:stop',
  SESSION_PAUSE: 'session:pause',
  SESSION_RESUME: 'session:resume',
  SESSION_INPUT: 'session:input',
  SESSION_LIST: 'session:list',
  SESSION_GET: 'session:get',

  // Terminal data
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_INPUT: 'terminal:input',

  // Events (main → renderer)
  SESSION_UPDATED: 'session:updated',
  SESSION_OUTPUT: 'session:output',
  SESSION_REMOVED: 'session:removed',
  ATTENTION_NEW: 'attention:new',

  // Project management
  PROJECT_LIST: 'project:list',
  PROJECT_ADD: 'project:add',
  PROJECT_REMOVE: 'project:remove',
  PROJECT_SELECT: 'project:select',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',

  // Projects scanning
  PROJECTS_SCAN_DIR: 'projects:scan-dir',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // App
  APP_GET_PATH: 'app:get-path',

  // Prompt Vault
  PROMPT_TEMPLATES_LIST: 'prompt:templates:list',
  PROMPT_TEMPLATES_SAVE: 'prompt:templates:save',
  PROMPT_TEMPLATES_DELETE: 'prompt:templates:delete',
  PROMPT_HISTORY_LIST: 'prompt:history:list',
  PROMPT_HISTORY_CLEAR: 'prompt:history:clear'
} as const

export const PROMPT_HISTORY_MAX = 50

// Estimated cost per token (rough averages)
export const COST_PER_INPUT_TOKEN = 0.000003
export const COST_PER_OUTPUT_TOKEN = 0.000015

// PTY buffer flush interval (60fps)
export const PTY_BUFFER_INTERVAL_MS = 16

// Default terminal dimensions
export const DEFAULT_COLS = 120
export const DEFAULT_ROWS = 30

// Agent card colors for projects
export const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
]
