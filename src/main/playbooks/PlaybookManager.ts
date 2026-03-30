import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'
import type { Playbook, PlaybookStepDefinition } from '../../shared/types'
import { extractTemplateVariables } from '../../shared/templateVars'

// ─── Shared Steps ────────────────────────────────────────────

const REVIEW_STEP: PlaybookStepDefinition = {
  name: 'Simplify & review',
  prompt: 'Review all changed code for reuse, quality, and efficiency. Fix any issues found. Check for duplicated logic, unnecessary complexity, and missed existing utilities.',
  permissionMode: 'default',
  effort: 'high'
}

const TEST_STEP: PlaybookStepDefinition = {
  name: 'Test & verify',
  prompt: 'Run the full test suite. Fix any test failures caused by recent changes. Do not fix pre-existing failures.',
  permissionMode: 'default',
  effort: 'medium'
}

// ─── Built-in Playbooks ───────────────────────────────────────

const BUILT_IN_PLAYBOOKS: Omit<Playbook, 'id' | 'variables'>[] = [
  // ─── Development Playbooks ────────────────────────────────
  {
    name: 'Fix Issue',
    description: 'Branch, plan, fix, review, test — then commit',
    icon: 'bug',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Create branch',
        prompt: 'Create and switch to a new git branch named fix/{{issueSlug}}. Do not make any other changes.',
        permissionMode: 'auto',
        effort: 'low'
      },
      {
        name: 'Plan approach',
        prompt: 'Analyze the codebase and plan how to fix: {{issueDescription}}. Identify root cause, affected files, and approach.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement fix',
        prompt: 'Implement the fix for: {{issueDescription}}. Follow existing patterns in the codebase.',
        permissionMode: 'default',
        effort: 'high'
      },
      REVIEW_STEP,
      TEST_STEP
    ]
  },
  {
    name: 'Feature Build',
    description: 'Branch, plan, implement, review, test — then commit',
    icon: 'bolt',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Create branch',
        prompt: 'Create and switch to a new git branch named feat/{{featureSlug}}. Do not make any other changes.',
        permissionMode: 'auto',
        effort: 'low'
      },
      {
        name: 'Plan approach',
        prompt: 'Analyze the codebase and design the implementation for: {{featureDescription}}. Consider existing patterns, affected files, and edge cases.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement feature',
        prompt: 'Implement the feature: {{featureDescription}}. Follow existing patterns in the codebase.',
        permissionMode: 'default',
        effort: 'high'
      },
      REVIEW_STEP,
      TEST_STEP
    ]
  },
  {
    name: 'Code Review',
    description: 'Read changes, identify issues, suggest improvements',
    icon: 'eye',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Read changes',
        prompt: 'Read all uncommitted changes (git diff) and recent commits. Summarize what changed and why.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Identify issues',
        prompt: 'Review for bugs, edge cases, security issues, race conditions, performance, pattern inconsistencies.',
        permissionMode: 'plan',
        effort: 'max'
      },
      {
        name: 'Suggest improvements',
        prompt: 'For each issue, provide a specific code fix or improvement with file and line references.',
        permissionMode: 'plan',
        effort: 'high'
      }
    ]
  },
  {
    name: 'Refactor',
    description: 'Run tests, refactor, verify — then commit',
    icon: 'refresh',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Run baseline tests',
        prompt: 'Run the full test suite and record the results. Note any pre-existing failures.',
        permissionMode: 'default',
        effort: 'medium'
      },
      {
        name: 'Refactor',
        prompt: 'Refactor {{target}} to improve {{goal}}. Maintain exact same external behavior.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Verify tests',
        prompt: 'Run full test suite. Fix regressions. Do not fix pre-existing failures.',
        permissionMode: 'default',
        effort: 'medium'
      }
    ]
  },
  {
    name: 'Test Coverage',
    description: 'Analyze coverage, write tests, verify',
    icon: 'test',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Analyze coverage',
        prompt: 'Run the test suite with coverage enabled. Identify files and functions with low or missing test coverage. Prioritize critical paths.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Write missing tests',
        prompt: 'Write comprehensive tests for the uncovered areas identified in the previous analysis. Cover happy path, edge cases, and error conditions. Follow existing test patterns.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Verify improvement',
        prompt: 'Run the full test suite with coverage. Verify all new tests pass and coverage improved. Fix any failures.',
        permissionMode: 'default',
        effort: 'medium'
      }
    ]
  },

  // ─── Documentation Playbooks ──────────────────────────────
  {
    name: 'System Architecture Doc',
    description: 'Analyze codebase and write architecture documentation',
    icon: 'search',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Analyze codebase',
        prompt: 'Analyze the entire project structure, architecture, data flow, and key design decisions.',
        permissionMode: 'plan',
        effort: 'max'
      },
      {
        name: 'Write architecture doc',
        prompt: 'Write a comprehensive system architecture document to {{outputPath}}. Cover: overview, architecture diagram (ASCII), component responsibilities, data flow, tech stack decisions, and key patterns.',
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },
  {
    name: 'Tech Design Doc',
    description: 'Analyze context and write technical design document',
    icon: 'search',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Analyze context',
        prompt: 'Analyze the codebase to understand how {{feature}} should be designed. Study existing patterns and constraints.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write tech design',
        prompt: 'Write a technical design document for {{feature}} to {{outputPath}}. Cover: context, requirements, proposed design, alternatives considered, implementation plan, risks.',
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },
  {
    name: 'Test Plan',
    description: 'Analyze feature and write comprehensive test plan',
    icon: 'test',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Analyze feature',
        prompt: 'Analyze {{feature}} in the codebase. Identify all testable behaviors, edge cases, and integration points.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write test plan',
        prompt: 'Write a comprehensive test plan for {{feature}} to {{outputPath}}. Cover: scope, test cases (unit, integration, e2e), edge cases, acceptance criteria.',
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },
  {
    name: 'PRD',
    description: 'Research context and write product requirements document',
    icon: 'eye',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Research context',
        prompt: 'Analyze the current codebase and understand how {{feature}} fits. Identify existing capabilities, gaps, and user-facing implications.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write PRD',
        prompt: 'Write a product requirements document for {{feature}} to {{outputPath}}. Cover: problem statement, goals, user stories, requirements (functional + non-functional), success metrics, out of scope.',
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  }
]

/**
 * PlaybookManager: Built-in playbook definitions + persistence.
 * On startup: migrates routines.json → playbooks.json if needed.
 */
export class PlaybookManager {
  private playbooks: Playbook[] = []
  private filePath: string

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'playbooks.json')

    // Migrate from routines.json if needed
    try { renameSync(join(userDataPath, 'routines.json'), this.filePath) } catch { /* No migration needed */ }

    this.load()
  }

  listPlaybooks(): Playbook[] {
    return this.playbooks
  }

  getPlaybook(id: string): Playbook | undefined {
    return this.playbooks.find(r => r.id === id)
  }

  savePlaybook(playbook: Playbook): Playbook {
    const existing = playbook.id ? this.playbooks.findIndex(r => r.id === playbook.id) : -1
    const saved: Playbook = {
      ...playbook,
      id: existing >= 0 ? playbook.id : uuid(),
      builtIn: existing >= 0 ? this.playbooks[existing].builtIn : false,
      variables: extractTemplateVariables(playbook.steps.map(s => s.prompt))
    }
    if (existing >= 0) {
      // Don't allow editing built-in playbooks
      if (this.playbooks[existing].builtIn) return this.playbooks[existing]
      this.playbooks[existing] = saved
    } else {
      this.playbooks.push(saved)
    }
    this.save()
    return saved
  }

  deletePlaybook(id: string): void {
    const filtered = this.playbooks.filter(r => r.id !== id || r.builtIn)
    if (filtered.length === this.playbooks.length) return // nothing removed
    this.playbooks = filtered
    this.save()
  }

  duplicatePlaybook(id: string): Playbook {
    const source = this.playbooks.find(r => r.id === id)
    if (!source) throw new Error(`Playbook ${id} not found`)
    const clone: Playbook = {
      ...source,
      id: uuid(),
      name: source.name + ' (Copy)',
      builtIn: false,
      variables: [...source.variables],
      steps: source.steps.map(s => ({ ...s }))
    }
    this.playbooks.push(clone)
    this.save()
    return clone
  }

  // ─── Private ───────────────────────────────────────────────

  private load(): void {
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      this.playbooks = JSON.parse(raw)
    } catch {
      // File missing or corrupt — seed below
    }

    if (this.playbooks.length === 0) {
      this.playbooks = BUILT_IN_PLAYBOOKS.map(r => ({
        ...r,
        id: uuid(),
        variables: extractTemplateVariables(r.steps.map(s => s.prompt))
      }))
      this.save()
    }
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.playbooks, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
