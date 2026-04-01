import { v4 as uuid } from 'uuid'
import { renameSync } from 'fs'
import { join } from 'path'
import type { Playbook, PlaybookStepDefinition } from '../../shared/types'
import { extractTemplateVariables } from '../../shared/templateVars'
import { JsonFileStore } from '../JsonFileStore'

// ─── Shared Steps ────────────────────────────────────────────

const REVIEW_STEP: PlaybookStepDefinition = {
  name: 'Review',
  prompt: 'Review all changed code. Look for: duplicated logic, unnecessary complexity, missed reuse of existing utilities, and anything that could be simpler. Fix every issue you find.',
  permissionMode: 'default',
  effort: 'high'
}

const TEST_STEP: PlaybookStepDefinition = {
  name: 'Test',
  prompt: 'Run the project\'s test suite. Fix any failures caused by the changes you made. Ignore pre-existing failures.',
  permissionMode: 'default',
  effort: 'medium'
}

// ─── Built-in Playbooks ───────────────────────────────────────

const BUILT_IN_PLAYBOOKS: Omit<Playbook, 'id' | 'variables'>[] = [
  // ─── Development ───────────────────────────────────────────
  {
    name: 'Build Feature',
    description: 'Branch, plan, implement, review, test — then commit',
    icon: 'bolt',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Create branch',
        prompt: 'Create and switch to branch feat/{{featureSlug}}. Make no other changes.',
        permissionMode: 'auto',
        effort: 'low'
      },
      {
        name: 'Plan',
        prompt: `You are implementing: {{featureDescription}}

Explore the codebase first. Then produce a plan covering:
- Which files to create or modify, and why
- Existing utilities, patterns, or components to reuse
- Edge cases to handle

Do not write any code yet.`,
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Implement',
        prompt: `Implement: {{featureDescription}}

Requirements:
- Follow the conventions already established in this codebase
- Reuse existing utilities and components — do not reinvent
- Keep the change minimal and focused`,
        permissionMode: 'default',
        effort: 'high'
      },
      REVIEW_STEP,
      TEST_STEP
    ]
  },
  {
    name: 'Fix Issue',
    description: 'Branch, diagnose, fix, review, test — then commit',
    icon: 'bug',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Create branch',
        prompt: 'Create and switch to branch fix/{{issueSlug}}. Make no other changes.',
        permissionMode: 'auto',
        effort: 'low'
      },
      {
        name: 'Diagnose',
        prompt: `Investigate: {{issueDescription}}

Find the root cause. Trace the code path, check related tests, and identify every file that needs to change. Explain the root cause clearly. Do not write any code yet.`,
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Fix',
        prompt: `Fix: {{issueDescription}}

Requirements:
- Only change what is necessary to resolve the issue
- Follow existing code patterns
- Do not refactor surrounding code`,
        permissionMode: 'default',
        effort: 'high'
      },
      REVIEW_STEP,
      TEST_STEP
    ]
  },
  {
    name: 'Refactor',
    description: 'Baseline tests, refactor, verify — then commit',
    icon: 'refresh',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Baseline',
        prompt: 'Run the full test suite. Record the results and note any pre-existing failures.',
        permissionMode: 'default',
        effort: 'medium'
      },
      {
        name: 'Refactor',
        prompt: 'Refactor {{target}} to improve {{goal}}. External behavior must remain identical.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Verify',
        prompt: 'Run the full test suite. Fix any regressions from the refactor. Ignore pre-existing failures.',
        permissionMode: 'default',
        effort: 'medium'
      }
    ]
  },
  {
    name: 'Code Review',
    description: 'Read changes, find issues, suggest fixes',
    icon: 'eye',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Analyze',
        prompt: 'Read all uncommitted changes (git diff HEAD) and recent commits. Summarize what changed and which areas are affected.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Review',
        prompt: `Review the changes for:
- Bugs, security issues, race conditions
- Edge cases and error handling gaps
- Performance problems
- Violations of existing codebase conventions

Rank each finding as critical, warning, or nit. For each, give the exact file, line, and a specific fix.`,
        permissionMode: 'plan',
        effort: 'max'
      }
    ]
  },
  {
    name: 'Test Coverage',
    description: 'Find gaps, write tests, verify',
    icon: 'test',
    builtIn: true,
    endsWithCommit: true,
    steps: [
      {
        name: 'Analyze',
        prompt: 'Run the test suite with coverage. Identify files and functions with low or missing coverage. Prioritize critical code paths.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Write tests',
        prompt: 'Write tests for the uncovered areas. Cover the happy path, edge cases, and error conditions. Follow the existing test patterns in this project.',
        permissionMode: 'default',
        effort: 'high'
      },
      {
        name: 'Verify',
        prompt: 'Run the full test suite with coverage. Confirm all new tests pass and coverage improved. Fix any failures.',
        permissionMode: 'default',
        effort: 'medium'
      }
    ]
  },

  // ─── Documentation ────────────────────────────────────────
  {
    name: 'Architecture Doc',
    description: 'Analyze codebase, write architecture documentation',
    icon: 'search',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Analyze',
        prompt: 'Map the entire project: structure, architecture, data flow, component boundaries, and key design decisions.',
        permissionMode: 'plan',
        effort: 'max'
      },
      {
        name: 'Write doc',
        prompt: `Write docs/architecture.md (create the directory if needed). Cover:
- Project overview
- High-level architecture (include a Mermaid diagram)
- Component responsibilities and data flow
- Tech stack rationale and key patterns`,
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },
  {
    name: 'Tech Design Doc',
    description: 'Research and write a technical design document',
    icon: 'search',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Research',
        prompt: 'Study the codebase to understand how {{feature}} should be designed. Note existing patterns, data models, and constraints.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write doc',
        prompt: `Write docs/design-{{feature}}.md (create the directory if needed). Cover:
- Context and motivation
- Requirements
- Proposed design (include Mermaid diagrams)
- Alternatives considered
- Implementation plan and risks`,
        permissionMode: 'default',
        effort: 'high'
      }
    ]
  },
  {
    name: 'PRD',
    description: 'Research and write product requirements',
    icon: 'eye',
    builtIn: true,
    endsWithCommit: false,
    steps: [
      {
        name: 'Research',
        prompt: 'Analyze the codebase to understand how {{feature}} fits into the product. Identify existing capabilities and gaps.',
        permissionMode: 'plan',
        effort: 'high'
      },
      {
        name: 'Write PRD',
        prompt: `Write docs/prd-{{feature}}.md (create the directory if needed). Cover:
- Problem statement
- Goals and non-goals
- User stories
- Functional and non-functional requirements
- Success metrics`,
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
  private store: JsonFileStore<Playbook[]>

  constructor(userDataPath: string) {
    this.store = new JsonFileStore(join(userDataPath, 'playbooks.json'))

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
    const saved = this.store.read([])
    const userPlaybooks = saved.filter(p => !p.builtIn)

    // Always generate built-ins from code
    const builtIns: Playbook[] = BUILT_IN_PLAYBOOKS.map(r => ({
      ...r,
      id: `builtin-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      variables: extractTemplateVariables(r.steps.map(s => s.prompt))
    }))

    const merged = [...builtIns, ...userPlaybooks]

    // Only write if content actually changed
    if (JSON.stringify(merged) !== JSON.stringify(saved)) {
      this.playbooks = merged
      this.save()
    } else {
      this.playbooks = merged
    }
  }

  private save(): void {
    this.store.write(this.playbooks)
  }
}
