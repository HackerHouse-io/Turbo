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
  TERMINAL_BUFFER_READ: 'terminal:buffer:read',

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
  PROJECT_SET_RUN_COMMAND: 'project:set-run-command',
  PROJECT_DETECT_RUN_COMMAND: 'project:detect-run-command',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',
  DIALOG_OPEN_FILE: 'dialog:open-file',

  // Attachments
  ATTACHMENT_SAVE_CLIPBOARD_IMAGE: 'attachment:save-clipboard-image',
  ATTACHMENT_GET_FILE_INFO: 'attachment:get-file-info',
  ATTACHMENT_GET_THUMBNAIL: 'attachment:get-thumbnail',

  // Projects scanning
  PROJECTS_SCAN_DIR: 'projects:scan-dir',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // App
  APP_GET_PATH: 'app:get-path',

  // Claude CLI
  CLAUDE_DETECT_MODELS: 'claude:detect-models',
  CLAUDE_GENERATE_SLUG: 'claude:generate-slug',

  // Prompt History
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

  // Worktree
  WORKTREE_CREATE: 'worktree:create',
  WORKTREE_LIST: 'worktree:list',
  WORKTREE_REBASE: 'worktree:rebase',
  WORKTREE_CREATE_PR: 'worktree:create-pr',
  WORKTREE_REMOVE: 'worktree:remove',

  // Notifications
  NOTIFICATION_CLICK: 'notification:click',

  // GitHub Integration
  GITHUB_SAVE_TOKEN: 'github:save-token',
  GITHUB_REMOVE_TOKEN: 'github:remove-token',
  GITHUB_CONNECTION_STATUS: 'github:connection-status',
  GITHUB_LIST_ORGS: 'github:list-orgs',

  // Project Creation
  PROJECT_CREATE_NEW: 'project:create-new',

  // Xcode
  XCODE_DETECT_PROJECT: 'xcode:detect-project',
  XCODE_OPEN_PROJECT: 'xcode:open-project'
} as const

export const PROMPT_HISTORY_MAX = 50
export const SESSION_HISTORY_MAX = 200
export const MAX_ACTIVITY_BLOCKS = 200
export const MAX_PERSISTED_BLOCKS = 50

// ─── Session option labels ───────────────────────────────────
import type { EffortLevel, PermissionMode } from './types'

export const EFFORT_LEVELS: { value: EffortLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' }
]

export const PERMISSION_MODES: { value: PermissionMode; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'plan', label: 'Plan' },
  { value: 'auto', label: 'Auto' }
]

// ─── Attention Type Display ───────────────────────────────────

import type { AttentionType, NotificationPreferences } from './types'

export const ATTENTION_TYPE_COLORS: Record<AttentionType, string> = {
  error: 'bg-red-500',
  completed: 'bg-emerald-500',
  decision: 'bg-amber-500',
  stuck: 'bg-orange-500',
  review: 'bg-blue-500',
}

export const ATTENTION_TYPE_LABELS: Record<AttentionType, string> = {
  completed: 'Completed',
  decision: 'Decision Required',
  error: 'Error',
  stuck: 'Stuck',
  review: 'Review Ready',
}

// ─── Default Notification Preferences ─────────────────────────

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  completed: { osNotification: true, inAppToast: true },
  decision:  { osNotification: true, inAppToast: true },
  error:     { osNotification: true, inAppToast: true },
  stuck:     { osNotification: true, inAppToast: true },
  review:    { osNotification: true, inAppToast: true },
}

// Estimated cost per token (rough averages)
export const COST_PER_INPUT_TOKEN = 0.000003
export const COST_PER_OUTPUT_TOKEN = 0.000015

// ─── GitHub Integration ─────────────────────────────────────────

import type { GitHubRepoDefaults } from './types'

export const GITHUB_API_BASE = 'https://api.github.com'

export const COMMON_LICENSES = [
  { value: '', label: 'None' },
  { value: 'MIT', label: 'MIT License' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'GPL-3.0', label: 'GPL 3.0' },
  { value: 'BSD-2-Clause', label: 'BSD 2-Clause' },
  { value: 'BSD-3-Clause', label: 'BSD 3-Clause' },
  { value: 'ISC', label: 'ISC' },
  { value: 'MPL-2.0', label: 'Mozilla Public License 2.0' },
  { value: 'Unlicense', label: 'The Unlicense' },
]

export const COMMON_GITIGNORE_TEMPLATES = [
  { value: '', label: 'None' },
  { value: 'Node', label: 'Node' },
  { value: 'Python', label: 'Python' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Go', label: 'Go' },
  { value: 'Java', label: 'Java' },
  { value: 'Swift', label: 'Swift' },
  { value: 'Kotlin', label: 'Kotlin' },
  { value: 'C', label: 'C' },
  { value: 'C++', label: 'C++' },
  { value: 'Ruby', label: 'Ruby' },
]

export const DEFAULT_GITHUB_REPO_DEFAULTS: GitHubRepoDefaults = {
  visibility: 'private',
  defaultOrg: '',
  autoInitReadme: true,
  defaultLicense: 'MIT',
  defaultGitignore: 'Node',
  descriptionTemplate: '',
}

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

// ─── Default Keybindings ─────────────────────────────────────

import type { KeybindingDefinition } from './types'

export const DEFAULT_KEYBINDINGS: KeybindingDefinition[] = [
  { id: 'toggleCommandPalette',    label: 'Command Palette',   description: 'Open / close command palette',     defaultShortcut: 'meta+k' },
  { id: 'toggleTerminalWorkspace', label: 'Terminal',           description: 'Toggle terminal workspace',        defaultShortcut: 'ctrl+`' },
  { id: 'toggleSettings',          label: 'Settings',           description: 'Open / close settings',            defaultShortcut: 'meta+,' },
  { id: 'toggleOverview',          label: 'Project Overview',   description: 'Toggle project overview',          defaultShortcut: 'meta+shift+o' },
  { id: 'toggleTimeline',          label: 'Timeline',           description: 'Toggle session timeline',          defaultShortcut: 'meta+shift+t' },
  { id: 'togglePlanOverlay',       label: 'Plan',               description: 'Toggle plan overlay',              defaultShortcut: null },
  { id: 'toggleProjectSelector',   label: 'Switch Project',     description: 'Open project selector',            defaultShortcut: null },
  { id: 'showShortcuts',           label: 'Keyboard Shortcuts', description: 'Show keyboard shortcuts overlay',  defaultShortcut: 'meta+/' },
]

// ─── Git Quick Actions ─────────────────────────────────────────

import type { GitQuickAction } from './types'

export const GIT_AI_MESSAGE_PLACEHOLDER = '{{message}}'

export const GIT_QUICK_ACTIONS: GitQuickAction[] = [
  { id: 'status', label: 'Status',              icon: 'git-branch', defaultCommand: 'git status',         builtIn: true },
  { id: 'stage',  label: 'Stage All',           icon: 'git-stage',  defaultCommand: 'git add -A',         builtIn: true },
  { id: 'commit', label: 'Commit',              icon: 'git-commit', defaultCommand: 'git add -A && git commit -m "{{message}}"', aiCommit: true, builtIn: true },
  { id: 'push',   label: 'Push',                icon: 'git-push',   defaultCommand: 'git push',           builtIn: true },
  { id: 'pull',   label: 'Pull & Rebase',       icon: 'git-pull',   defaultCommand: 'git pull --rebase',  builtIn: true },
  { id: 'full',   label: 'Stage + Commit + Push', icon: 'git-commit', defaultCommand: 'git add -A && git commit -m "{{message}}" && git push', aiCommit: true, builtIn: true },
]
