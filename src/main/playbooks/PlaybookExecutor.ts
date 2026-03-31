import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import type { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import type { PlaybookManager } from './PlaybookManager'
import type {
  PlaybookExecution,
  PlaybookStepState,
  StartPlaybookPayload,
  AgentSession
} from '../../shared/types'
import { substituteTemplateVariables } from '../../shared/templateVars'

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

  constructor(sessionManager: ClaudeSessionManager, playbookManager: PlaybookManager) {
    super()
    this.sessionManager = sessionManager
    this.playbookManager = playbookManager

    // Monitor session completions to advance playbook steps
    this.boundHandleSessionUpdate = (session: AgentSession) => this.handleSessionUpdate(session)
    this.sessionManager.on('session-updated', this.boundHandleSessionUpdate)
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
    if (!exec || exec.status === 'completed' || exec.status === 'stopped') return

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
    this.cleanupExecution(executionId)
  }

  dismissPlaybook(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || exec.status !== 'awaiting_commit') return

    exec.status = 'completed'
    exec.completedAt = Date.now()
    this.emitUpdate(exec)

    // Clean up from maps
    this.cleanupExecution(executionId)
  }

  removeExecution(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec) return

    // Stop if still running
    if (exec.status === 'running' || exec.status === 'paused') {
      this.stopPlaybook(executionId)
    }

    this.cleanupExecution(executionId)
  }

  listExecutions(): PlaybookExecution[] {
    return Array.from(this.executions.values())
  }

  dispose(): void {
    // Stop all running executions
    for (const [id, exec] of this.executions) {
      if (exec.status === 'running' || exec.status === 'paused') {
        this.stopPlaybook(id)
      }
    }
    this.sessionManager.removeListener('session-updated', this.boundHandleSessionUpdate)
  }

  // ─── Private ─────────────────────────────────────────────────

  private cleanupExecution(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (exec) {
      // Remove reverse lookup entries
      for (const step of exec.steps) {
        if (step.sessionId) {
          this.sessionToExecution.delete(step.sessionId)
        }
      }
    }
    this.executions.delete(executionId)
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
      this.cleanupExecution(executionId)
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
          this.cleanupExecution(exec.id)
        }
      }
    } else if (session.status === 'error' || session.status === 'stopped') {
      currentStep.status = 'failed'
      currentStep.completedAt = Date.now()
      currentStep.error = session.status === 'error' ? 'Session error' : 'Session stopped'
      exec.status = 'failed'
      exec.completedAt = Date.now()
      this.emitUpdate(exec)
      this.cleanupExecution(exec.id)
    }
  }

  private emitUpdate(execution: PlaybookExecution): void {
    this.emit('playbook-updated', execution)
  }
}
