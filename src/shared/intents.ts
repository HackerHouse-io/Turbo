import type { PermissionMode, EffortLevel, CreateSessionPayload } from './types'

export interface Intent {
  id: string
  label: string
  icon: string
  description: string
  permissionMode: PermissionMode
  effort: EffortLevel
  print: boolean
  color: string
  wrapPrompt: (userPrompt: string) => string
}

export const BUILT_IN_INTENTS: Intent[] = [
  {
    id: 'quick',
    label: 'Quick',
    icon: 'zap',
    description: 'Send prompt as-is — no wrapping',
    permissionMode: 'default',
    effort: 'medium',
    print: false,
    color: '#6366f1',
    wrapPrompt: (p) => p
  },
  {
    id: 'build',
    label: 'Build',
    icon: 'bolt',
    description: 'Implement a feature with auto-accept',
    permissionMode: 'auto',
    effort: 'high',
    print: false,
    color: '#22c55e',
    wrapPrompt: (p) =>
      `Explore the codebase first to understand existing patterns and architecture, then implement: ${p}\n\nFollow conventions already established in this codebase. Reuse existing utilities and components. Keep the change minimal and focused.`
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: 'bug',
    description: 'Diagnose and fix a bug with auto-accept',
    permissionMode: 'auto',
    effort: 'max',
    print: false,
    color: '#ef4444',
    wrapPrompt: (p) =>
      `Investigate the root cause, trace the code path, and check related tests. Then fix: ${p}\n\nFollow existing conventions. Only change what is necessary.`
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: 'map',
    description: 'Analyze codebase and create a plan (read-only)',
    permissionMode: 'plan',
    effort: 'high',
    print: true,
    color: '#8b5cf6',
    wrapPrompt: (p) =>
      `Analyze the codebase and create a detailed plan for: ${p}\n\nInclude file paths, approach, trade-offs, and implementation steps.`
  },
  {
    id: 'review',
    label: 'Review',
    icon: 'eye',
    description: 'Review code changes (read-only)',
    permissionMode: 'plan',
    effort: 'max',
    print: true,
    color: '#3b82f6',
    wrapPrompt: (p) =>
      `Review all uncommitted changes (git diff HEAD) and recent commits. ${p ? p : ''}\n\nFor each issue found, give the exact file, line, severity (critical/warning/nit), and a specific fix suggestion.`
  },
  {
    id: 'test',
    label: 'Test',
    icon: 'flask',
    description: 'Run tests, find gaps, write new tests',
    permissionMode: 'default',
    effort: 'high',
    print: false,
    color: '#f59e0b',
    wrapPrompt: (p) =>
      `Run existing tests, identify gaps in coverage, then write tests for: ${p}\n\nFollow existing test patterns in this project. Cover happy path, edge cases, and error conditions.`
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: 'refresh',
    description: 'Refactor code while keeping behavior identical',
    permissionMode: 'default',
    effort: 'high',
    print: false,
    color: '#06b6d4',
    wrapPrompt: (p) =>
      `Refactor: ${p}\n\nExternal behavior must remain identical. Run tests before and after to verify no regressions.`
  },
  {
    id: 'document',
    label: 'Document',
    icon: 'file-text',
    description: 'Write documentation, PRDs, or design docs',
    permissionMode: 'default',
    effort: 'high',
    print: false,
    color: '#ec4899',
    wrapPrompt: (p) =>
      `Write documentation for: ${p}\n\nBe concise, useful, and include code examples where relevant.`
  }
]

export function getIntent(id: string): Intent {
  return BUILT_IN_INTENTS.find(i => i.id === id) || BUILT_IN_INTENTS[0]
}

export const DEFAULT_INTENT_ID = 'quick'

export function buildSessionPayload(
  intent: Intent,
  userPrompt: string,
  projectPath: string,
  model?: string,
  attachments?: CreateSessionPayload['attachments']
): CreateSessionPayload {
  const rawUser = userPrompt.trim()
  const atRefs = attachments?.length
    ? attachments.map(a => `@${a.filePath}`).join('\n')
    : ''
  const fullPrompt = [atRefs, rawUser].filter(Boolean).join('\n\n')

  // Title seed: prefer the user's real words; fall back to attachment filenames
  // so image-only submissions still get a sensible Claude-generated title.
  const titleSeed = rawUser || (attachments?.length
    ? `Task involving attached file(s): ${attachments.map(a => a.fileName).join(', ')}`
    : '')

  return {
    projectPath,
    prompt: intent.wrapPrompt(fullPrompt),
    titleSeed,
    permissionMode: intent.permissionMode,
    effort: intent.effort,
    model,
    print: intent.print,
    attachments
  }
}

const PLAN_TASK_INTENT: Intent = {
  id: 'plan-task',
  label: 'Plan & Build',
  icon: 'bolt',
  description: 'Plan then implement a PLAN.md task',
  permissionMode: 'auto',
  effort: 'high',
  print: false,
  color: '#22c55e',
  wrapPrompt: (task) =>
    `You are implementing a task from this project's PLAN.md roadmap.

## Task
${task}

## Before writing any code
1. Read PLAN.md — understand where this task fits and what's already done
2. Explore the codebase — find relevant files, patterns, and recent git history
3. Identify reusable code, types, and utilities
4. Present a clear implementation plan:
   - Files to create/modify (with paths)
   - Key changes in each file
   - Edge cases and testing approach
5. Flag any risks or ambiguities

## Then
Ask me to approve the plan. After I approve, implement it following codebase conventions. Keep changes minimal and focused.`
}

export function buildPlanTaskPayload(taskContent: string, projectPath: string): CreateSessionPayload {
  return buildSessionPayload(PLAN_TASK_INTENT, taskContent, projectPath)
}
