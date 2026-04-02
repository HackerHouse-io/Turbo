// ─── Agent Status ───────────────────────────────────────────────

export type AgentStatus =
  | 'starting'
  | 'active'
  | 'waiting_for_input'
  | 'paused'
  | 'error'
  | 'completed'
  | 'stopped'

const TERMINAL_STATUSES = new Set<string>(['completed', 'error', 'stopped', 'failed'])

/** True when a session or playbook execution has reached a final state */
export function isTerminalStatus(status: AgentStatus | PlaybookExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

// ─── Activity Blocks (Warp-style) ──────────────────────────────

export type ActivityBlockType =
  | 'read'
  | 'edit'
  | 'write'
  | 'bash'
  | 'search'
  | 'plan'
  | 'think'
  | 'message'
  | 'tool'
  | 'unknown'

export interface ActivityBlock {
  id: string
  type: ActivityBlockType
  title: string
  content: string
  timestamp: number
  duration?: number
  files?: string[]
  collapsed: boolean
}

// ─── Agent Sessions ─────────────────────────────────────────────

export interface AgentSession {
  id: string
  name: string
  projectId: string
  projectPath: string
  status: AgentStatus
  prompt?: string
  branch?: string
  startedAt: number
  completedAt?: number
  tokenCount: number
  estimatedCost: number
  activityBlocks: ActivityBlock[]
  lastActivity: string
  currentAction?: string
  needsAttention: boolean
  attentionMessage?: string
  attentionType?: AttentionType
  touchedFiles?: string[]
}

// ─── Attention Queue ────────────────────────────────────────────

export type AttentionType = 'decision' | 'stuck' | 'review' | 'error' | 'completed'

export interface AttentionItem {
  id: string
  sessionId: string
  type: AttentionType
  title: string
  message: string
  timestamp: number
  dismissed: boolean
  read: boolean
}

// ─── Notification Preferences ──────────────────────────────────

export interface NotificationTypeSettings {
  osNotification: boolean
  inAppToast: boolean
}

export type NotificationPreferences = Record<AttentionType, NotificationTypeSettings>

// ─── Plain Terminal ─────────────────────────────────────────────

export type PlainTerminalType = 'shell' | 'claude'

export interface PlainTerminal {
  id: string
  type: PlainTerminalType
  projectPath: string
  shell: string
  createdAt: number
}

export interface CreatePlainTerminalPayload {
  projectPath: string
  type: PlainTerminalType
}

// ─── Run Command ────────────────────────────────────────────────

export type RunCommandFileSource =
  | 'package.json' | 'pubspec.yaml' | 'xcworkspace' | 'xcodeproj'
  | 'Makefile' | 'Cargo.toml' | 'go.mod' | 'pyproject.toml'

export type RunCommandSource = RunCommandFileSource | 'claude' | 'user'

// ─── Xcode Project Info ────────────────────────────────────────

export type XcodePlatform = 'iOS' | 'macOS' | 'watchOS' | 'tvOS' | 'visionOS' | 'multiplatform'
export type XcodeProjectType = 'xcworkspace' | 'xcodeproj' | 'spm'

export interface XcodeProjectInfo {
  openPath: string
  type: XcodeProjectType
  name: string
  platform: XcodePlatform | null
}

// ─── Projects ───────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  path: string
  color: string
  lastOpened: number
  activeAgents: number
  gitIdentityOverride?: GitIdentity
  runCommand?: string
  runCommandSource?: RunCommandSource
  runCommandSourceMtime?: number // mtime of source file at detection time
}

// ─── CLI Flag Types ─────────────────────────────────────────────

export type PermissionMode = 'default' | 'plan' | 'auto'
export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// ─── Attachments ────────────────────────────────────────────────

export interface AttachmentInfo {
  id: string
  filePath: string       // absolute path on disk
  fileName: string       // basename for display
  mimeType: string       // e.g. 'image/png', 'text/plain'
  sizeBytes: number
  isImage: boolean
}

// ─── IPC Payloads ───────────────────────────────────────────────

export interface CreateSessionPayload {
  projectPath: string
  prompt?: string
  name?: string
  permissionMode?: PermissionMode
  effort?: EffortLevel
  model?: string
  attachments?: AttachmentInfo[]
}

export interface ClaudeModelInfo {
  alias: string
  label: string
}

// ─── Prompt History ────────────────────────────────────────────

export interface PromptHistoryItem {
  id: string
  prompt: string
  projectPath: string
  timestamp: number
}

export interface SessionInputPayload {
  sessionId: string
  input: string
}

export interface TerminalResizePayload {
  sessionId: string
  cols: number
  rows: number
}

export interface AddProjectPayload {
  name: string
  path: string
  color?: string
}

// ─── Scanned Projects ─────────────────────────────────────────

export interface ScannedProject {
  name: string
  path: string
  hasGit: boolean
  hasPackageJson: boolean
}

// ─── Git Identity ─────────────────────────────────────────────

export interface GitIdentity {
  name: string
  email: string
}

export interface ResolvedGitIdentity {
  identity: GitIdentity | null
  source: 'project-override' | 'project-gitconfig' | 'global-override' | 'global-gitconfig' | 'none'
}

// ─── Git Presets ──────────────────────────────────────────────

export interface GitPreset {
  id: string
  name: string
  description: string
  commands: string[]
  variables: string[]
  builtIn: boolean
  icon: string
  flow?: 'quick-commit' | 'full-commit-push'
}

export interface GitCommandResult {
  success: boolean
  command: string
  stdout: string
  stderr: string
  exitCode: number
}

export interface GitWorkflowResult {
  success: boolean
  steps: GitCommandResult[]
  abortedAt?: number
}

export interface GitAIMessageResult {
  message: string
  diffStat: string
}

export interface GitCommitPayload {
  projectPath: string
  message: string
}

export interface GitExecPayload {
  projectPath: string
  commands: string[]
}

// ─── Git Nerve Center ────────────────────────────────────────

export interface GitBranchInfo {
  branch: string
  dirty: number    // unstaged modified + untracked
  staged: number   // staged files
}

export interface GitCommitEntry {
  hash: string          // short hash
  message: string       // first line
  relativeTime: string  // e.g. "2 hours ago"
}

// ─── Playbooks ──────────────────────────────────────────────

export interface PlaybookStepDefinition {
  name: string
  prompt: string                  // Supports {{variable}} syntax
  permissionMode?: PermissionMode
  effort?: EffortLevel
}

export interface Playbook {
  id: string
  name: string
  description: string
  icon: string
  steps: PlaybookStepDefinition[]
  variables: string[]             // Auto-extracted from step prompts
  builtIn: boolean
  endsWithCommit: boolean         // If true, playbook enters awaiting_commit after last step
}

export type PlaybookStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface PlaybookStepState {
  index: number
  name: string
  status: PlaybookStepStatus
  sessionId?: string
  startedAt?: number
  completedAt?: number
  error?: string
}

export type PlaybookExecutionStatus = 'running' | 'paused' | 'awaiting_commit' | 'completed' | 'failed' | 'stopped'

export interface PlaybookExecution {
  id: string
  playbookId: string
  playbookName: string
  projectPath: string
  status: PlaybookExecutionStatus
  steps: PlaybookStepState[]
  currentStepIndex: number
  currentStepWaiting?: boolean
  startedAt: number
  completedAt?: number
  variables: Record<string, string>
  worktreePath?: string
  worktreeSourceProject?: string
}

export interface StartPlaybookPayload {
  playbookId: string
  projectPath: string
  variables: Record<string, string>
  startFromStep?: number
  worktreePath?: string
  worktreeSourceProject?: string
}

// ─── Worktree ────────────────────────────────────────────────

export interface WorktreeInfo {
  path: string
  branch: string
  slug: string
  projectPath: string
}

export interface RebaseResult {
  success: boolean
  conflicted: boolean
  message: string
}

export interface PRResult {
  success: boolean
  url?: string
  message: string
}

export interface CreateWorktreePayload {
  projectPath: string
  slug: string
}

// ─── Plan ─────────────────────────────────────────────────────

export interface PlanReadResult {
  found: boolean
  filePath: string | null
  raw: string | null
  lastModified: number
  searchedPaths: string[]
}

export interface PlanSavePayload {
  filePath: string
  content: string
  lastModified: number
}

export interface PlanSaveResult {
  success: boolean
  conflict: boolean
  lastModified: number
}

// ─── Git Quick Actions ───────────────────────────────────────

export interface GitQuickAction {
  id: string
  label: string
  icon: string
  defaultCommand: string
  aiCommit?: boolean
  builtIn: boolean
}

export interface GitQuickActionOverride {
  id: string
  label: string
  icon: string
  command: string
}

// ─── Keybindings ──────────────────────────────────────────────

export type KeybindingActionId =
  | 'toggleCommandPalette' | 'toggleTerminalWorkspace' | 'toggleSettings'
  | 'toggleOverview' | 'toggleTimeline' | 'togglePlanOverlay'
  | 'toggleProjectSelector' | 'showShortcuts'

export interface KeybindingDefinition {
  id: KeybindingActionId
  label: string
  description: string
  defaultShortcut: string | null  // "meta+k", "ctrl+`", "meta+shift+o"
}

export type KeybindingOverrides = Partial<Record<KeybindingActionId, string | null>>

// ─── GitHub Integration ─────────────────────────────────────────

export type RepoVisibility = 'private' | 'public'

export type GitHubAuthSource = 'gh-cli' | 'classic-token' | 'fine-grained-token'

export interface GitHubUser {
  login: string
  avatarUrl: string
  name: string | null
  email: string | null
  plan?: string
}

export interface GitHubOrg {
  login: string
  avatarUrl: string
  description: string | null
}

export interface GitHubConnectionStatus {
  connected: boolean
  source: GitHubAuthSource | null
  user: GitHubUser | null
  orgs: GitHubOrg[]
  scopes: string[]
}

export interface GitHubTokenValidation {
  valid: boolean
  source?: GitHubAuthSource
  user?: GitHubUser
  scopes?: string[]
  error?: string
}

export interface GitHubRepoDefaults {
  visibility: RepoVisibility
  defaultOrg: string
  autoInitReadme: boolean
  defaultLicense: string
  defaultGitignore: string
  descriptionTemplate: string
}

export interface CreateGitHubRepoPayload {
  name: string
  description: string
  visibility: RepoVisibility
  org: string
  license: string
  gitignoreTemplate: string
}

export interface CreateGitHubRepoResult {
  success: boolean
  cloneUrl?: string
  sshUrl?: string
  htmlUrl?: string
  error?: string
}

export interface CreateProjectPayload {
  name: string
  description: string
  createGitHubRepo: boolean
  visibility: RepoVisibility
  org: string
  license: string
  gitignoreTemplate: string
  initReadme: boolean
}

export interface CreateProjectResult {
  success: boolean
  projectPath?: string
  projectId?: string
  repoUrl?: string
  error?: string
  steps: { label: string; success: boolean; error?: string }[]
}

// ─── Settings ─────────────────────────────────────────────────

export interface TurboSettings {
  defaultProjectsDir: string
  gitIdentityGlobal?: GitIdentity
  notificationsEnabled?: boolean
  notificationSound?: boolean
  notificationPreferences?: NotificationPreferences
  defaultModel?: string
  defaultEffort?: EffortLevel
  defaultPermissionMode?: PermissionMode
  gitQuickActionOverrides?: Record<string, string>
  gitCustomActions?: GitQuickActionOverride[]
  keybindingOverrides?: KeybindingOverrides
  playbookSkipConfirm?: Record<string, boolean>
  githubRepoDefaults?: GitHubRepoDefaults
  [key: string]: unknown
}
