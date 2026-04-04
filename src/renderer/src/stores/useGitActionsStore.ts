import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import type { AgentSession } from '../../../shared/types'

type ActionName = 'commit' | 'push' | 'pull' | 'ship'

interface GitActionsState {
  loading: Record<ActionName, boolean>
  lastMessage: string | null
  lastError: string | null
  lastPRUrl: string | null
  shipProgress: string | null

  quickCommit: () => Promise<void>
  push: () => Promise<void>
  pull: () => Promise<void>
  shipIt: () => Promise<void>
  setError: (msg: string) => void
  clearStatus: () => void
  clearPRUrl: () => void
}

/** Derived selector — true when any action is running */
export const selectBusy = (s: GitActionsState) =>
  s.loading.commit || s.loading.push || s.loading.pull || s.loading.ship

function getProjectPath(): string | undefined {
  const s = useProjectStore.getState()
  const proj = s.projects.find(p => p.id === s.selectedProjectId)
  return proj?.path
}

async function stageAndCommit(path: string): Promise<string> {
  const stageResult = await window.api.gitStageAll(path)
  if (!stageResult.success) throw new Error(stageResult.stderr || 'Failed to stage files')

  const ai = await window.api.gitAIMessage(path)
  if (!ai.message) throw new Error('No changes to commit')

  const commitResult = await window.api.gitCommit({ projectPath: path, message: ai.message })
  if (!commitResult.success) throw new Error(commitResult.stderr || 'Commit failed')

  return ai.message
}

function waitForSessionComplete(sessionId: string, timeoutMs = 180_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Conflict resolution timed out'))
    }, timeoutMs)

    const cleanup = window.api.onSessionUpdated((session: AgentSession) => {
      if (session.id !== sessionId) return
      if (session.status === 'completed') {
        clearTimeout(timeout)
        cleanup()
        resolve()
      } else if (session.status === 'error' || session.status === 'stopped') {
        clearTimeout(timeout)
        cleanup()
        reject(new Error('Conflict resolution failed'))
      }
    })
  })
}

/** Run a git action with loading/error state management */
async function runAction(
  name: ActionName,
  fn: () => Promise<void>
): Promise<void> {
  const { loading } = useGitActionsStore.getState()
  if (selectBusy(useGitActionsStore.getState())) return

  useGitActionsStore.setState({
    loading: { ...loading, [name]: true },
    lastError: null
  })
  try {
    await fn()
  } catch (err: unknown) {
    useGitActionsStore.setState({ lastError: (err as Error).message })
  } finally {
    const cur = useGitActionsStore.getState().loading
    useGitActionsStore.setState({ loading: { ...cur, [name]: false } })
  }
}

export const useGitActionsStore = create<GitActionsState>(() => ({
  loading: { commit: false, push: false, pull: false, ship: false },
  lastMessage: null,
  lastError: null,
  lastPRUrl: null,
  shipProgress: null,

  clearStatus: () => useGitActionsStore.setState({ lastMessage: null, lastError: null }),
  clearPRUrl: () => useGitActionsStore.setState({ lastPRUrl: null }),
  setError: (msg: string) => useGitActionsStore.setState({ lastError: msg }),

  quickCommit: () => runAction('commit', async () => {
    const path = getProjectPath()
    if (!path) return
    const message = await stageAndCommit(path)
    useGitActionsStore.setState({ lastMessage: message })
  }),

  push: () => runAction('push', async () => {
    const path = getProjectPath()
    if (!path) return
    const result = await window.api.gitPush(path)
    if (!result.success) throw new Error(result.stderr || 'Push failed')
    useGitActionsStore.setState({ lastMessage: 'Pushed successfully' })
  }),

  pull: () => runAction('pull', async () => {
    const path = getProjectPath()
    if (!path) return
    const result = await window.api.gitPullRebase(path)
    if (!result.success) throw new Error(result.stderr || 'Pull failed')
    useGitActionsStore.setState({ lastMessage: 'Pulled & rebased' })
  }),

  shipIt: () => runAction('ship', async () => {
    const path = getProjectPath()
    if (!path) return
    const setState = useGitActionsStore.setState

    setState({ lastPRUrl: null, shipProgress: 'Checking branch...' })

    try {
      const branch = await window.api.gitGetBranch(path)
      if (branch === 'main' || branch === 'master') {
        throw new Error('Cannot ship from the main branch. Create a feature branch first.')
      }

      setState({ shipProgress: 'Committing changes...' })
      await stageAndCommit(path)

      setState({ shipProgress: 'Pushing to remote...' })
      const pushResult = await window.api.gitPushUpstream(path, branch)
      if (!pushResult.success) throw new Error(pushResult.stderr || 'Push failed')

      setState({ shipProgress: 'Merging main...' })
      const mergeResult = await window.api.gitMergeMain(path)

      if (!mergeResult.success) {
        const conflicts = await window.api.gitConflictFiles(path)
        if (conflicts.length > 0) {
          setState({ shipProgress: 'Resolving merge conflicts...' })

          const conflictPrompt = `There are merge conflicts in the following files that need to be resolved.
For each conflicted file, resolve the conflict by keeping ALL changes from both sides — preserve every feature from both branches.
Files with conflicts: ${conflicts.join(', ')}

After resolving all conflicts:
1. Run \`git add\` on each resolved file
2. Run \`git commit --no-edit\` to complete the merge

Do NOT remove any functionality from either side of the conflict.`

          const session = await window.api.createSession({
            projectPath: path,
            prompt: conflictPrompt,
            name: 'Merge Conflict Resolution',
            permissionMode: 'auto',
            effort: 'high'
          })

          await waitForSessionComplete(session.id)

          const statusAfter = await window.api.gitStatus(path)
          if (statusAfter.stdout.includes('UU') || statusAfter.stdout.includes('AA')) {
            throw new Error('Merge conflicts remain unresolved')
          }
        } else if (!mergeResult.stderr.includes('Already up to date')) {
          throw new Error(mergeResult.stderr || 'Merge failed')
        }
      }

      setState({ shipProgress: 'Pushing merge...' })
      const pushMerge = await window.api.gitPushUpstream(path, branch)
      if (!pushMerge.success && !pushMerge.stderr.includes('Everything up-to-date')) {
        throw new Error(pushMerge.stderr || 'Push after merge failed')
      }

      setState({ shipProgress: 'Creating pull request...' })
      const prInfo = await window.api.gitAIPRDescription(path)
      const prResult = await window.api.gitCreatePR(path, prInfo.title, prInfo.body)

      if (!prResult.success) throw new Error(prResult.message || 'PR creation failed')

      setState({ lastMessage: `PR created: ${prInfo.title}`, lastPRUrl: prResult.url || null })
    } finally {
      setState({ shipProgress: null })
    }
  })
}))
