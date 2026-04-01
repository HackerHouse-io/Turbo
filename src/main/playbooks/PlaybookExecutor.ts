import { EventEmitter } from 'events'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import type { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import type { PlaybookManager } from './PlaybookManager'
import { JsonFileStore } from '../JsonFileStore'
import type {
  PlaybookExecution,
  PlaybookStepState,
  StartPlaybookPayload,
  AgentSession
} from '../../shared/types'
import { isTerminalStatus } from '../../shared/types'
import { substituteTemplateVariables } from '../../shared/templateVars'
import { PLAYBOOK_HISTORY_MAX } from '../../shared/constants'

/**
 * PlaybookExecutor: Orchestrates multi-step playbook execution.
 *
 * Events:
 * - 'playbook-updated' (execution: PlaybookExecution)
 */
export class PlaybookExecutor extends EventEmitter {
  private executions = new Map<string, PlaybookExecution>()
  private sessionToExecution = new Map<string, string>()
  private sessionManager: ClaudeSessionManager
  private playbookManager: PlaybookManager
  private boundHandleSessionUpdate: (session: AgentSession) => void
  private store: JsonFileStore<PlaybookExecution[]>

  constructor(sessionManager: ClaudeSessionManager, playbookManager: PlaybookManager, userDataPath: string) {
    super()
    this.sessionManager = sessionManager
    this.playbookManager = playbookManager
    this.store = new JsonFileStore(join(userDataPath, 'playbook-executions.json'))

    // Monitor session completions to advance playbook steps
    this.boundHandleSessionUpdate = (session: AgentSession) => this.handleSessionUpdate(session)
    this.sessionManager.on('session-updated', this.boundHandleSessionUpdate)

    this.load()
  }

  // ─── Public API ──────────────────────────────────────────────

  async startPlaybook(payload: StartPlaybookPayload): Promise<PlaybookExecution> {
    const playbook = this.playbookManager.getPlaybook(payload.playbookId)
    if (!playbook) throw new Error(`Playbook not found: ${payload.playbookId}`)

    const startFrom = payload.startFromStep ?? 0

    const steps: PlaybookStepState[] = playbook.steps.map((step, index) => ({
      index,
      name: step.name,
      status: index < startFrom ? 'skipped' : 'pending'
    }))

    const execution: PlaybookExecution = {
      id: uuid(),
      playbookId: playbook.id,
      playbookName: playbook.name,
      projectPath: payload.projectPath,
      status: 'running',
      steps,
      currentStepIndex: startFrom,
      startedAt: Date.now(),
      variables: payload.variables,
      worktreePath: payload.worktreePath,
      worktreeSourceProject: payload.worktreeSourceProject
    }

    this.executions.set(execution.id, execution)
    this.emitUpdate(execution)

    await this.runStep(execution.id, startFrom)

    return execution
  }

  pausePlaybook(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || exec.status !== 'running') return

    exec.status = 'paused'
    this.emitUpdate(exec)
  }

  resumePlaybook(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || exec.status !== 'paused') return

    exec.status = 'running'
    this.emitUpdate(exec)

    // If current step already completed while paused, advance
    const currentStep = exec.steps[exec.currentStepIndex]
    if (currentStep && currentStep.status === 'completed') {
      const nextIndex = exec.currentStepIndex + 1
      if (nextIndex < exec.steps.length) {
        this.runStep(executionId, nextIndex)
      }
    }
  }

  stopPlaybook(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || isTerminalStatus(exec.status)) return

    // Stop current session
    const currentStep = exec.steps[exec.currentStepIndex]
    if (currentStep?.sessionId && currentStep.status === 'running') {
      this.sessionManager.stopSession(currentStep.sessionId)
      currentStep.status = 'failed'
    }

    // Skip remaining steps
    for (const step of exec.steps) {
      if (step.status === 'pending') {
        step.status = 'skipped'
      }
    }

    exec.status = 'stopped'
    exec.completedAt = Date.now()
    this.emitUpdate(exec)
    this.cleanupReverseMap(executionId)
  }

  dismissPlaybook(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || exec.status !== 'awaiting_commit') return

    exec.status = 'completed'
    exec.completedAt = Date.now()
    this.emitUpdate(exec)

    this.cleanupReverseMap(executionId)
  }

  removeExecution(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec) return

    // Stop if still running
    if (exec.status === 'running' || exec.status === 'paused') {
      this.stopPlaybook(executionId)
    }

    this.cleanupReverseMap(executionId)
    this.executions.delete(executionId)
    this.save()
  }

  listExecutions(): PlaybookExecution[] {
    return Array.from(this.executions.values())
  }

  dispose(): void {
    // Mark running executions as stopped without killing sessions (session manager handles that)
    for (const exec of this.executions.values()) {
      this.markInterrupted(exec)
    }
    this.save()
    this.sessionManager.removeListener('session-updated', this.boundHandleSessionUpdate)
  }

  // ─── Persistence ────────────────────────────────────────────

  private load(): void {
    const executions = this.store.read([])

    for (const exec of executions) {
      this.markInterrupted(exec)
      this.executions.set(exec.id, exec)
    }

    this.enforceHistoryCap()
  }

  private save(): void {
    this.enforceHistoryCap()
    this.store.write(Array.from(this.executions.values()))
  }

  private enforceHistoryCap(): void {
    if (this.executions.size <= PLAYBOOK_HISTORY_MAX) return
    const all = Array.from(this.executions.values())
      .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0))

    let toRemove = this.executions.size - PLAYBOOK_HISTORY_MAX
    for (const exec of all) {
      if (toRemove <= 0) break
      if (isTerminalStatus(exec.status)) {
        this.executions.delete(exec.id)
        toRemove--
      }
    }
  }

  /** Mark a non-terminal execution as interrupted (used by load and dispose) */
  private markInterrupted(exec: PlaybookExecution): void {
    if (isTerminalStatus(exec.status)) return
    exec.status = 'stopped'
    exec.completedAt = exec.completedAt || Date.now()
    for (const step of exec.steps) {
      if (step.status === 'running') {
        step.status = 'failed'
        step.error = 'Interrupted by app restart'
        step.completedAt = Date.now()
      } else if (step.status === 'pending') {
        step.status = 'skipped'
      }
    }
  }

  // ─── Private ─────────────────────────────────────────────────

  private cleanupReverseMap(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (exec) {
      for (const step of exec.steps) {
        if (step.sessionId) {
          this.sessionToExecution.delete(step.sessionId)
        }
      }
    }
  }

  private async runStep(executionId: string, stepIndex: number): Promise<void> {
    const exec = this.executions.get(executionId)
    if (!exec) return

    if (exec.status !== 'running') return

    const playbook = this.playbookManager.getPlaybook(exec.playbookId)
    if (!playbook) return

    const stepDef = playbook.steps[stepIndex]
    const step = exec.steps[stepIndex]
    if (!stepDef || !step) return

    // Substitute variables in prompt
    const prompt = substituteTemplateVariables(stepDef.prompt, exec.variables)

    // Mark step as running and update index synchronously before async work
    step.status = 'running'
    step.startedAt = Date.now()
    exec.currentStepIndex = stepIndex
    this.emitUpdate(exec)

    // Create session for this step
    try {
      const session = await this.sessionManager.createSession({
        projectPath: exec.projectPath,
        prompt,
        name: `[Playbook] ${exec.playbookName} — ${step.name}`,
        permissionMode: stepDef.permissionMode,
        effort: stepDef.effort
      })

      step.sessionId = session.id
      this.sessionToExecution.set(session.id, executionId)
      this.emitUpdate(exec)
    } catch (err) {
      step.status = 'failed'
      step.error = err instanceof Error ? err.message : 'Failed to create session'
      exec.status = 'failed'
      exec.completedAt = Date.now()
      this.emitUpdate(exec)
      this.cleanupReverseMap(executionId)
    }
  }

  private handleSessionUpdate(session: AgentSession): void {
    // O(1) lookup via reverse map instead of iterating all executions
    const execId = this.sessionToExecution.get(session.id)
    if (!execId) return

    const exec = this.executions.get(execId)
    if (!exec) return

    const currentStep = exec.steps[exec.currentStepIndex]
    if (!currentStep || currentStep.sessionId !== session.id) return

    // Guard against reprocessing already-completed steps
    if (currentStep.status !== 'running') return

    if (session.status === 'completed') {
      currentStep.status = 'completed'
      currentStep.completedAt = Date.now()

      const playbook = this.playbookManager.getPlaybook(exec.playbookId)
      const nextIndex = exec.currentStepIndex + 1

      if (nextIndex < exec.steps.length) {
        // Set next index synchronously to prevent double-advance
        exec.currentStepIndex = nextIndex
        if (exec.status === 'running') {
          this.emitUpdate(exec)
          this.runStep(exec.id, nextIndex)
        } else {
          // Paused — just save completion, resume will pick up
          this.emitUpdate(exec)
        }
      } else {
        // Last step completed
        if (playbook?.endsWithCommit) {
          exec.status = 'awaiting_commit'
          this.emitUpdate(exec)
        } else {
          exec.status = 'completed'
          exec.completedAt = Date.now()
          this.emitUpdate(exec)
          this.cleanupReverseMap(exec.id)
        }
      }
    } else if (session.status === 'error' || session.status === 'stopped') {
      currentStep.status = 'failed'
      currentStep.completedAt = Date.now()
      currentStep.error = session.status === 'error' ? 'Session error' : 'Session stopped'
      exec.status = 'failed'
      exec.completedAt = Date.now()
      this.emitUpdate(exec)
      this.cleanupReverseMap(exec.id)
    }
  }

  private emitUpdate(execution: PlaybookExecution): void {
    this.emit('playbook-updated', execution)
    this.save()
  }
}
