import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Routine, RoutineStepDefinition } from '../../shared/types'
import { extractTemplateVariables } from '../../shared/templateVars'

// ─── Shared Steps ────────────────────────────────────────────

const REVIEW_STEP: RoutineStepDefinition = {
  name: 'Simplify & review',
  prompt: 'Review all changed code for reuse, quality, and efficiency. Fix any issues found. Check for duplicated logic, unnecessary complexity, and missed existing utilities.',
  permissionMode: 'default',
  effort: 'high'
}

const TEST_STEP: RoutineStepDefinition = {
  name: 'Test & verify',
  prompt: 'Run the full test suite. Fix any test failures caused by recent changes. Do not fix pre-existing failures.',
  permissionMode: 'default',
  effort: 'medium'
}

// ─── Built-in Routines ───────────────────────────────────────

const BUILT_IN_ROUTINES: Omit<Routine, 'id' | 'variables'>[] = [
  // ─── Development Routines ────────────────────────────────
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

  // ─── Documentation Routines ──────────────────────────────
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
 * RoutineManager: Built-in routine definitions + persistence.
 * Follows PromptVaultManager pattern — JSON file in userData.
 */
export class RoutineManager {
  private routines: Routine[] = []
  private filePath: string

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'routines.json')
    this.load()
  }

  listRoutines(): Routine[] {
    return [...this.routines]
  }

  getRoutine(id: string): Routine | undefined {
    return this.routines.find(r => r.id === id)
  }

  saveRoutine(routine: Routine): Routine {
    const existing = routine.id ? this.routines.findIndex(r => r.id === routine.id) : -1
    const saved: Routine = {
      ...routine,
      id: existing >= 0 ? routine.id : uuid(),
      builtIn: existing >= 0 ? this.routines[existing].builtIn : false,
      variables: extractTemplateVariables(routine.steps.map(s => s.prompt))
    }
    if (existing >= 0) {
      // Don't allow editing built-in routines
      if (this.routines[existing].builtIn) return this.routines[existing]
      this.routines[existing] = saved
    } else {
      this.routines.push(saved)
    }
    this.save()
    return saved
  }

  deleteRoutine(id: string): void {
    const filtered = this.routines.filter(r => r.id !== id || r.builtIn)
    if (filtered.length === this.routines.length) return // nothing removed
    this.routines = filtered
    this.save()
  }

  duplicateRoutine(id: string): Routine {
    const source = this.routines.find(r => r.id === id)
    if (!source) throw new Error(`Routine ${id} not found`)
    const clone: Routine = {
      ...source,
      id: uuid(),
      name: source.name + ' (Copy)',
      builtIn: false,
      variables: [...source.variables],
      steps: source.steps.map(s => ({ ...s }))
    }
    this.routines.push(clone)
    this.save()
    return clone
  }

  // ─── Private ───────────────────────────────────────────────

  private load(): void {
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      this.routines = JSON.parse(raw)
    } catch {
      // File missing or corrupt — seed below
    }

    if (this.routines.length === 0) {
      this.routines = BUILT_IN_ROUTINES.map(r => ({
        ...r,
        id: uuid(),
        variables: extractTemplateVariables(r.steps.map(s => s.prompt))
      }))
      this.save()
    }
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.routines, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
