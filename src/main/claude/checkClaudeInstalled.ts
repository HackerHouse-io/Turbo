import { execFile } from 'child_process'
import type { ClaudeInstallStatus } from '../../shared/types'
import { getEnhancedEnv } from '../system/resolveShellPath'

/**
 * Detect whether the `claude` CLI is installed and reachable.
 *
 * Runs `claude --version` with the enhanced PATH (so Homebrew, Volta,
 * npm-global etc. are visible even when Electron was launched from
 * Finder). Crash safety: every code path is wrapped in try/catch and
 * returns a `ClaudeInstallStatus` object — this function NEVER throws.
 *
 * Result is memoized for the process lifetime — call
 * `invalidateClaudeInstallCache()` to force a re-check.
 */

const VERSION_RE = /(\d+\.\d+\.\d+(?:[-+][\w.]+)?)/

let cachedStatus: ClaudeInstallStatus | null = null
let inflight: Promise<ClaudeInstallStatus> | null = null

function runVersion(): Promise<ClaudeInstallStatus> {
  return new Promise(resolve => {
    execFile(
      'claude',
      ['--version'],
      { timeout: 5000, env: getEnhancedEnv(), maxBuffer: 64 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve({ installed: false, error: err.message })
          return
        }
        const m = (stdout || '').match(VERSION_RE)
        resolve(m ? { installed: true, version: m[1] } : { installed: true })
      }
    )
  })
}

export async function checkClaudeInstalled(): Promise<ClaudeInstallStatus> {
  if (cachedStatus) return cachedStatus
  if (inflight) return inflight

  inflight = runVersion().then(result => {
    cachedStatus = result
    return result
  })

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function invalidateClaudeInstallCache(): void {
  cachedStatus = null
}
