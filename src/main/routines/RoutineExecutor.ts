import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'
import type { ClaudeSessionManager } from '../claude/ClaudeSessionManager'
import type { RoutineManager } from './RoutineManager'
import type {
  RoutineExecution,
  RoutineStepState,
  StartRoutinePayload,
  AgentSession
} from '../../shared/types'

/**
 * RoutineExecutor: Orchestrates multi-step routine execution.
 *
 * Events:
 * - 'routine-updated' (execution: RoutineExecution)
 */
export class RoutineExecutor extends EventEmitter {
  private executions = new Map<string, RoutineExecution>()
  private sessionToExecution = new Map<string, string>()
  private sessionManager: ClaudeSessionManager
  private routineManager: RoutineManager
  private boundHandleSessionUpdate: (session: AgentSession) => void

  constructor(sessionManager: ClaudeSessionManager, routineManager: RoutineManager) {
    super()
    this.sessionManager = sessionManager
    this.routineManager = routineManager

    // Monitor session completions to advance routine steps
    this.boundHandleSessionUpdate = (session: AgentSession) => this.handleSessionUpdate(session)
    this.sessionManager.on('session-updated', this.boundHandleSessionUpdate)
  }

  // ─── Public API ──────────────────────────────────────────────

  async startRoutine(payload: StartRoutinePayload): Promise<RoutineExecution> {
    const routine = this.routineManager.getRoutine(payload.routineId)
    if (!routine) throw new Error(`Routine not found: ${payload.routineId}`)

    const steps: RoutineStepState[] = routine.steps.map((step, index) => ({
      index,
      name: step.name,
      status: 'pending'
    }))

    const execution: RoutineExecution = {
      id: uuid(),
      routineId: routine.id,
      routineName: routine.name,
      projectPath: payload.projectPath,
      status: 'running',
      steps,
      currentStepIndex: 0,
      startedAt: Date.now(),
      variables: payload.variables
    }

    this.executions.set(execution.id, execution)
    this.emitUpdate(execution)

    await this.runStep(execution.id, 0)

    return execution
  }

  pauseRoutine(executionId: string): void {
    const exec = this.executions.get(executionId)
    if (!exec || exec.status !== 'running') return

    exec.status = 'paused'
    this.emitUpdate(exec)
  }

  resumeRoutine(executionId: string): void {
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

  stopRoutine(executionId: string): void {
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
  }

  dismissRoutine(executionId: string): void {
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
      this.stopRoutine(executionId)
    }

    this.cleanupExecution(executionId)
  }

  listExecutions(): RoutineExecution[] {
    return Array.from(this.executions.values())
  }

  dispose(): void {
    // Stop all running executions
    for (const [id, exec] of this.executions) {
      if (exec.status === 'running' || exec.status === 'paused') {
        this.stopRoutine(id)
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

    const routine = this.routineManager.getRoutine(exec.routineId)
    if (!routine) return

    const stepDef = routine.steps[stepIndex]
    const step = exec.steps[stepIndex]
    if (!stepDef || !step) return

    // Substitute variables in prompt
    let prompt = stepDef.prompt
    for (const [key, val] of Object.entries(exec.variables)) {
      prompt = prompt.replaceAll(`{{${key}}}`, val)
    }

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
        name: `[Routine] ${exec.routineName} — ${step.name}`,
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

      const routine = this.routineManager.getRoutine(exec.routineId)
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
        if (routine?.endsWithCommit) {
          exec.status = 'awaiting_commit'
        } else {
          exec.status = 'completed'
          exec.completedAt = Date.now()
        }
        this.emitUpdate(exec)
      }
    } else if (session.status === 'error' || session.status === 'stopped') {
      currentStep.status = 'failed'
      currentStep.completedAt = Date.now()
      currentStep.error = session.status === 'error' ? 'Session error' : 'Session stopped'
      exec.status = 'failed'
      exec.completedAt = Date.now()
      this.emitUpdate(exec)
    }
  }

  private emitUpdate(execution: RoutineExecution): void {
    this.emit('routine-updated', {
      ...execution,
      steps: execution.steps.map(s => ({ ...s }))
    })
  }
}
