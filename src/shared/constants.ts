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
  SESSION_REMOVE: 'session:remove',

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

  // Claude CLI
  CLAUDE_DETECT_MODELS: 'claude:detect-models',

  // Prompt Vault
  PROMPT_TEMPLATES_LIST: 'prompt:templates:list',
  PROMPT_TEMPLATES_SAVE: 'prompt:templates:save',
  PROMPT_TEMPLATES_DELETE: 'prompt:templates:delete',
  PROMPT_HISTORY_LIST: 'prompt:history:list',
  PROMPT_HISTORY_CLEAR: 'prompt:history:clear',

  // Git Identity
  GIT_IDENTITY_DETECT_GLOBAL: 'git:identity:detect-global',
  GIT_IDENTITY_DETECT_PROJECT: 'git:identity:detect-project',
  GIT_IDENTITY_RESOLVE: 'git:identity:resolve',
  GIT_IDENTITY_SET_GLOBAL: 'git:identity:set-global',
  GIT_IDENTITY_SET_PROJECT: 'git:identity:set-project',

  // Git Operations
  GIT_EXEC: 'git:exec',
  GIT_STAGE_ALL: 'git:stage-all',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL_REBASE: 'git:pull-rebase',
  GIT_AI_MESSAGE: 'git:ai-message',
  GIT_STATUS: 'git:status',

  // Git Presets
  GIT_PRESETS_LIST: 'git:presets:list',
  GIT_PRESETS_SAVE: 'git:presets:save',
  GIT_PRESETS_DELETE: 'git:presets:delete',

  // Routines
  ROUTINE_LIST: 'routine:list',
  ROUTINE_START: 'routine:start',
  ROUTINE_PAUSE: 'routine:pause',
  ROUTINE_RESUME: 'routine:resume',
  ROUTINE_STOP: 'routine:stop',
  ROUTINE_DISMISS: 'routine:dismiss',
  ROUTINE_EXECUTIONS: 'routine:executions',
  ROUTINE_REMOVE: 'routine:remove',
  ROUTINE_SAVE: 'routine:save',
  ROUTINE_DELETE: 'routine:delete',
  ROUTINE_DUPLICATE: 'routine:duplicate',

  // Events (main → renderer)
  ROUTINE_UPDATED: 'routine:updated',

  // Plan
  PLAN_READ: 'plan:read',
  PLAN_SAVE: 'plan:save',
  PLAN_FILE_CHANGED: 'plan:file-changed',

  // Plain Terminal
  PLAIN_TERMINAL_CREATE: 'plain-terminal:create',
  PLAIN_TERMINAL_KILL: 'plain-terminal:kill',
  PLAIN_TERMINAL_INPUT: 'plain-terminal:input',
  PLAIN_TERMINAL_RESIZE: 'plain-terminal:resize',
  PLAIN_TERMINAL_DATA: 'plain-terminal:data',
  PLAIN_TERMINAL_EXIT: 'plain-terminal:exit',
  PLAIN_TERMINAL_LIST: 'plain-terminal:list',
  PLAIN_TERMINAL_CREATED: 'plain-terminal:created',
  PLAIN_TERMINAL_REMOVED: 'plain-terminal:removed',

  // Notifications
  NOTIFICATION_CLICK: 'notification:click'
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
