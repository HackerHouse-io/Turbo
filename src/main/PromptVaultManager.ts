import { v4 as uuid } from 'uuid'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { PromptTemplate, PromptHistoryItem } from '../shared/types'
import { PROMPT_HISTORY_MAX } from '../shared/constants'

const BUILT_IN_TEMPLATES: Omit<PromptTemplate, 'id'>[] = [
  {
    name: 'Fix Bug',
    description: 'Trace root cause, write failing test, fix, and verify',
    template:
      'Found this error:\n\n{{errorMessage}}\n\nSteps to reproduce: {{reproSteps}}\n\nTrace the root cause, write a failing test that reproduces it, fix the bug, then verify the test passes and the full test suite still passes.',
    variables: ['errorMessage', 'reproSteps'],
    builtIn: true,
    icon: 'bug',
    permissionMode: 'default',
    effort: 'high'
  },
  {
    name: 'Build Feature',
    description: 'Implement a feature following existing patterns with tests',
    template:
      'Implement: {{featureName}}\n\nContext: {{context}}\n\nFollow existing patterns in the codebase. Write tests covering the happy path and edge cases. Run the tests and fix any failures before finishing.',
    variables: ['featureName', 'context'],
    builtIn: true,
    icon: 'bolt',
    permissionMode: 'default',
    effort: 'high'
  },
  {
    name: 'Write Tests',
    description: 'Comprehensive tests for a file with edge cases',
    template:
      'Write comprehensive tests for {{filePath}}.\n\nCover: happy path, edge cases (empty/null inputs, boundary values), and error conditions. Run the tests after writing them and fix any failures.',
    variables: ['filePath'],
    builtIn: true,
    icon: 'test',
    permissionMode: 'default',
    effort: 'medium'
  },
  {
    name: 'Code Review',
    description: 'Review recent changes for issues and suggest fixes',
    template:
      'Review the recent changes for:\n- Edge cases and race conditions\n- Security issues (injection, XSS, insecure data handling)\n- Consistency with existing patterns\n- Performance concerns\n\nProvide specific file and line references with suggested fixes.',
    variables: [],
    builtIn: true,
    icon: 'eye',
    permissionMode: 'plan',
    effort: 'high'
  },
  {
    name: 'Refactor',
    description: 'Refactor code while maintaining behavior',
    template:
      'Refactor {{target}} to improve {{goal}}.\n\nMaintain the exact same external behavior. Run all existing tests before and after to verify nothing breaks. If tests fail, fix the issue before finishing.',
    variables: ['target', 'goal'],
    builtIn: true,
    icon: 'refresh',
    permissionMode: 'default',
    effort: 'high'
  },
  {
    name: 'Investigate',
    description: 'Deep read-only analysis of code flow',
    template:
      'Investigate: {{question}}\n\nRead the relevant code and trace the flow end-to-end. Summarize your findings with specific file paths and line numbers. Do not make any changes.',
    variables: ['question'],
    builtIn: true,
    icon: 'search',
    permissionMode: 'plan',
    effort: 'max'
  }
]

/**
 * PromptVaultManager: Template + history persistence.
 * Follows ProjectManager pattern — JSON files in userData.
 */
export class PromptVaultManager {
  private templates: PromptTemplate[] = []
  private history: PromptHistoryItem[] = []
  private templatesPath: string
  private historyPath: string

  constructor(userDataPath: string) {
    this.templatesPath = join(userDataPath, 'prompt-templates.json')
    this.historyPath = join(userDataPath, 'prompt-history.json')
    this.load()
  }

  // ─── Templates ─────────────────────────────────────────────

  listTemplates(): PromptTemplate[] {
    return this.templates
  }

  saveTemplate(t: PromptTemplate): PromptTemplate {
    const existing = this.templates.findIndex(x => x.id === t.id)
    const template: PromptTemplate = {
      ...t,
      id: t.id || uuid(),
      variables: this.extractVariables(t.template)
    }
    if (existing >= 0) {
      this.templates[existing] = template
    } else {
      this.templates.push(template)
    }
    this.saveTemplates()
    return template
  }

  deleteTemplate(id: string): void {
    const t = this.templates.find(x => x.id === id)
    if (t && t.builtIn) return
    this.templates = this.templates.filter(x => x.id !== id)
    this.saveTemplates()
  }

  // ─── History ───────────────────────────────────────────────

  listHistory(): PromptHistoryItem[] {
    return this.history
  }

  addHistory(prompt: string, projectPath: string): void {
    // Dedupe by prompt text — remove existing match
    this.history = this.history.filter(h => h.prompt !== prompt)

    // Add at front
    this.history.unshift({
      id: uuid(),
      prompt,
      projectPath,
      timestamp: Date.now()
    })

    // Cap at max
    if (this.history.length > PROMPT_HISTORY_MAX) {
      this.history = this.history.slice(0, PROMPT_HISTORY_MAX)
    }

    this.saveHistory()
  }

  clearHistory(): void {
    this.history = []
    this.saveHistory()
  }

  // ─── Private ───────────────────────────────────────────────

  private extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{(\w+)\}\}/g)
    const vars = new Set<string>()
    for (const m of matches) {
      vars.add(m[1])
    }
    return Array.from(vars)
  }

  private load(): void {
    // Load templates — readFileSync throws on missing file, caught below
    try {
      const raw = readFileSync(this.templatesPath, 'utf-8')
      this.templates = JSON.parse(raw)
    } catch {
      // File missing or corrupt — will seed below
    }

    // Seed built-in templates if none exist
    if (this.templates.length === 0) {
      this.templates = BUILT_IN_TEMPLATES.map(t => ({ ...t, id: uuid() }))
      this.saveTemplates()
    }

    // Load history
    try {
      const raw = readFileSync(this.historyPath, 'utf-8')
      this.history = JSON.parse(raw)
    } catch {
      // File missing or corrupt — start fresh
    }
  }

  private saveTemplates(): void {
    try {
      writeFileSync(this.templatesPath, JSON.stringify(this.templates, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }

  private saveHistory(): void {
    try {
      writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf-8')
    } catch {
      // Save failed — non-fatal
    }
  }
}
