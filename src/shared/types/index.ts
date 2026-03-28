// ─── Agent Status ───────────────────────────────────────────────

export type AgentStatus =
  | 'starting'
  | 'active'
  | 'waiting_for_input'
  | 'paused'
  | 'error'
  | 'completed'
  | 'stopped'

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
}

// ─── CLI Flag Types ─────────────────────────────────────────────

export type PermissionMode = 'default' | 'plan' | 'auto'
export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// ─── IPC Payloads ───────────────────────────────────────────────

export interface CreateSessionPayload {
  projectPath: string
  prompt?: string
  name?: string
  permissionMode?: PermissionMode
  effort?: EffortLevel
  model?: string
}

export interface ClaudeModelInfo {
  alias: string
  label: string
}

// ─── Prompt Vault ──────────────────────────────────────────────

export type TemplateIconName = 'bug' | 'bolt' | 'test' | 'eye' | 'refresh' | 'search'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
  builtIn: boolean
  icon: TemplateIconName
  permissionMode?: PermissionMode
  effort?: EffortLevel
}

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

// ─── Settings ─────────────────────────────────────────────────

export interface TurboSettings {
  defaultProjectsDir: string
  gitIdentityGlobal?: GitIdentity
  [key: string]: unknown
}
