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

// ─── Settings ─────────────────────────────────────────────────

export interface TurboSettings {
  defaultProjectsDir: string
  [key: string]: unknown
}
