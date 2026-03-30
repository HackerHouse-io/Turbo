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

const IOS_BUILD_TEST_STEP: PlaybookStepDefinition = {
  name: 'Build & test',
  prompt: 'Build the project using xcodebuild (detect the scheme and destination from the project). Fix any build errors or warnings introduced by recent changes. Run the test suite with xcodebuild test and fix any test failures caused by the new code.',
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
        prompt: 'Analyze the codebase and plan how to fix: {{issueDescription}}. Identify the root cause, list every file that needs to change, and describe the fix approach step by step.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement fix',
        prompt: 'Implement the fix for: {{issueDescription}}. Follow existing code patterns. Keep changes minimal — only modify what is necessary to resolve the issue.',
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
        prompt: 'Analyze the codebase and design the implementation for: {{featureDescription}}. List affected files, describe the architecture, identify edge cases, and note any existing utilities to reuse.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement feature',
        prompt: 'Implement the feature: {{featureDescription}}. Follow existing code patterns in the codebase. Reuse existing utilities and components where possible.',
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
        prompt: 'Read all uncommitted changes (git diff HEAD) and the last 5 commits. Summarize what changed, why, and which areas of the codebase are affected.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Identify issues',
        prompt: 'Review for bugs, security vulnerabilities, race conditions, edge cases, performance issues, and violations of existing code patterns. Rank findings by severity (critical, warning, nit).',
        permissionMode: 'plan',
        effort: 'max'
      },
      {
        name: 'Suggest improvements',
        prompt: 'For each issue found, provide a specific code fix with exact file path and line reference. Group by severity.',
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
        prompt: 'Analyze the entire project structure, architecture, data flow, and key design decisions. Map out all major components and how they communicate.',
        permissionMode: 'plan',
        effort: 'max'
      },
      {
        name: 'Write architecture doc',
        prompt: 'Write a comprehensive system architecture document to docs/architecture.md (create the docs/ directory if it doesn\'t exist). Cover: project overview, high-level architecture diagram (Mermaid), component responsibilities, data flow, tech stack decisions, and key patterns used.',
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
        prompt: 'Analyze the codebase to understand how {{feature}} should be designed. Study existing patterns, data models, and architectural constraints.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write tech design',
        prompt: 'Write a technical design document to docs/design-{{feature}}.md (create the docs/ directory if it doesn\'t exist). Cover: context & motivation, requirements, proposed design with diagrams (Mermaid), alternatives considered, implementation plan, and risks.',
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
        prompt: 'Analyze {{feature}} in the codebase. Identify all testable behaviors, integration points, edge cases, and failure modes.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write test plan',
        prompt: 'Write a comprehensive test plan to docs/test-plan-{{feature}}.md (create the docs/ directory if it doesn\'t exist). Cover: scope, test strategy, test cases (unit, integration, e2e), edge cases, performance criteria, and acceptance criteria.',
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
        prompt: 'Analyze the current codebase and understand how {{feature}} fits into the product. Identify existing capabilities, gaps, and user-facing implications.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write PRD',
        prompt: 'Write a product requirements document to docs/prd-{{feature}}.md (create the docs/ directory if it doesn\'t exist). Cover: problem statement, goals & non-goals, user stories, functional requirements, non-functional requirements, success metrics, and out of scope.',
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },

  // ─── iOS Development Playbooks ────────────────────────────
  {
    name: 'iOS Feature',
    description: 'Branch, plan, implement, build & test — then commit',
    icon: 'phone',
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
        prompt: 'Analyze the iOS project structure (Xcode project, targets, Swift packages). Design the implementation for: {{featureDescription}}. Identify which views, view models, models, and services need to change. Note any Info.plist or entitlement changes required.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement feature',
        prompt: 'Implement the iOS feature: {{featureDescription}}. Use SwiftUI for new views unless the project uses UIKit. Follow existing project patterns for architecture (MVVM, coordinators, etc.), naming conventions, and dependency injection. Reuse existing components and services.',
        permissionMode: 'default',
        effort: 'high'
      },
      IOS_BUILD_TEST_STEP
    ]
  },
  {
    name: 'iOS Bug Fix',
    description: 'Branch, diagnose, fix, build & test — then commit',
    icon: 'phone',
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
        name: 'Diagnose',
        prompt: 'Analyze the iOS codebase to diagnose: {{issueDescription}}. Check relevant view controllers/SwiftUI views, view models, services, and any platform-specific code (lifecycle, threading, memory). Identify the root cause and list files that need to change.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement fix',
        prompt: 'Fix the iOS issue: {{issueDescription}}. Follow existing project patterns. Keep changes minimal — only modify what is necessary to resolve the issue.',
        permissionMode: 'default',
        effort: 'high'
      },
      IOS_BUILD_TEST_STEP
    ]
  },
  {
    name: 'SwiftUI View',
    description: 'Plan UI, implement view, build & verify — then commit',
    icon: 'phone',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Plan UI',
        prompt: 'Design the SwiftUI view "{{viewName}}": {{viewDescription}}. Define the view hierarchy, state management (@State, @Binding, @ObservedObject, @EnvironmentObject as appropriate), and any subviews needed. Follow existing project patterns for theming, spacing, and component structure.',
        permissionMode: 'plan',
        effort: 'medium'
      },
      {
        name: 'Implement view',
        prompt: 'Implement the SwiftUI view "{{viewName}}" as designed. Create the view file and any supporting subviews, view models, or model types needed. Follow existing project naming conventions and file organization. Include a PreviewProvider with representative sample data.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Build & verify',
        prompt: 'Build the project using xcodebuild to verify the new view compiles without errors. Fix any build issues. If the project has snapshot or UI tests, run them and fix any failures.',
        permissionMode: 'default',
        effort: 'medium'
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
    // Read saved playbooks — only user-created ones survive reload
    let raw = ''
    let userPlaybooks: Playbook[] = []
    try {
      raw = readFileSync(this.filePath, 'utf-8')
      const all: Playbook[] = JSON.parse(raw)
      userPlaybooks = all.filter(p => !p.builtIn)
    } catch { /* File missing or corrupt */ }

    // Always generate built-ins from code
    const builtIns: Playbook[] = BUILT_IN_PLAYBOOKS.map(r => ({
      ...r,
      id: `builtin-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      variables: extractTemplateVariables(r.steps.map(s => s.prompt))
    }))

    this.playbooks = [...builtIns, ...userPlaybooks]

    // Only write if content actually changed
    const updated = JSON.stringify(this.playbooks, null, 2)
    if (updated !== raw) this.save()
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.playbooks, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
