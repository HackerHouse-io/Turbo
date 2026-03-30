import { useTerminalStore } from '../stores/useTerminalStore'
import { useUIStore } from '../stores/useUIStore'
import { GIT_AI_MESSAGE_PLACEHOLDER } from '../../../shared/constants'

// Tracks the last terminal created per project for reuse
const drawerTerminals = new Map<string, string>()

/**
 * Runs a command in the TerminalDrawer. Reuses an existing terminal for
 * the same project if one is still alive, otherwise creates a new one.
 * Returns the terminal ID on success, or null on failure.
 */
export async function runInTerminalDrawer(
  projectPath: string,
  command: string
): Promise<string | null> {
  // Try to reuse an existing terminal
  const existingId = drawerTerminals.get(projectPath)
  if (existingId && useTerminalStore.getState().terminals[existingId]) {
    useUIStore.getState().openPlainTerminalDrawer(existingId)
    window.api.sendPlainTerminalInput(existingId, command + '\n')
    return existingId
  }

  // Create a new terminal
  try {
    const terminal = await window.api.createPlainTerminal({ projectPath, type: 'shell' })
    if (!terminal) return null

    useTerminalStore.getState().addTerminal(terminal)
    drawerTerminals.set(projectPath, terminal.id)
    useUIStore.getState().openPlainTerminalDrawer(terminal.id)

    // Send the command after shell init
    setTimeout(() => {
      window.api.sendPlainTerminalInput(terminal.id, command + '\n')
    }, 300)

    return terminal.id
  } catch {
    return null
  }
}

/** Clean up the reuse map when a terminal is removed externally. */
export function clearDrawerTerminal(terminalId: string): void {
  for (const [path, id] of drawerTerminals) {
    if (id === terminalId) {
      drawerTerminals.delete(path)
      break
    }
  }
}

/**
 * Resolves a git command template. If the command has an AI commit placeholder,
 * fetches an AI-generated message and substitutes it. Falls back to interactive
 * commit (strips the -m flag) on failure.
 */
export async function resolveGitCommand(
  projectPath: string,
  command: string,
  aiCommit?: boolean
): Promise<string> {
  if (!aiCommit || !command.includes(GIT_AI_MESSAGE_PLACEHOLDER)) return command

  try {
    const result = await window.api.gitAIMessage(projectPath)
    if (result?.message) {
      const escaped = result.message.replace(/'/g, "'\\''")
      return command.replace(GIT_AI_MESSAGE_PLACEHOLDER, escaped)
    }
  } catch {
    // fall through to interactive fallback
  }

  // Strip -m flag so git opens the editor for manual input
  return command
    .replace(/ -m "{{message}}"/, '')
    .replace(/ -m '{{message}}'/, '')
}
