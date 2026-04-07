import { app } from 'electron'
import { join } from 'path'
import type { ClaudeUpdateStatus } from '../../shared/types'
import { CLAUDE_NPM_PACKAGE_URL } from '../../shared/constants'
import { isVersionNewer } from '../../shared/utils'
import { JsonFileStore } from '../JsonFileStore'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'
import { checkClaudeInstalled } from './checkClaudeInstalled'

/**
 * Detect whether a newer Claude CLI version is available on npm.
 *
 * Compares the locally-installed version (from `claude --version` via
 * `checkClaudeInstalled`) against the npm registry's "latest" tag for
 * `@anthropic-ai/claude-code`. The npm result is cached both in-memory
 * and on disk so cold-start launches return instantly when fresh.
 *
 * Crash safety: every code path is wrapped in try/catch and returns a
 * `ClaudeUpdateStatus` object — this function NEVER throws. Network
 * failures are silent (the modal is purely additive).
 */

const NPM_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const NPM_FETCH_TIMEOUT_MS = 5000

interface NpmCacheEntry {
  latestVersion: string
  fetchedAt: number
}

let diskStore: JsonFileStore<NpmCacheEntry | Record<string, never>> | null = null
function getDiskStore(): JsonFileStore<NpmCacheEntry | Record<string, never>> {
  if (!diskStore) {
    diskStore = new JsonFileStore(join(app.getPath('userData'), 'claude-update-cache.json'))
  }
  return diskStore
}

function isFresh(entry: NpmCacheEntry | null): entry is NpmCacheEntry {
  return !!entry && Date.now() - entry.fetchedAt < NPM_CACHE_TTL_MS
}

let memoryCache: NpmCacheEntry | null = null
let inflight: Promise<ClaudeUpdateStatus> | null = null

function loadCache(): NpmCacheEntry | null {
  if (memoryCache) return memoryCache
  const raw = getDiskStore().read({})
  if ('latestVersion' in raw && typeof raw.latestVersion === 'string' && typeof raw.fetchedAt === 'number') {
    memoryCache = { latestVersion: raw.latestVersion, fetchedAt: raw.fetchedAt }
    return memoryCache
  }
  return null
}

function saveCache(entry: NpmCacheEntry): void {
  memoryCache = entry
  getDiskStore().write(entry)
}

async function fetchLatestFromNpm(): Promise<string | null> {
  const cached = loadCache()
  if (isFresh(cached)) return cached.latestVersion

  // Dev override: skip the network entirely so we can test the modal
  // flow without waiting for an actual upstream release.
  const fake = process.env.TURBO_FAKE_NPM_VERSION
  if (fake) {
    saveCache({ latestVersion: fake, fetchedAt: Date.now() })
    return fake
  }

  try {
    const res = await fetchWithTimeout(CLAUDE_NPM_PACKAGE_URL, { timeoutMs: NPM_FETCH_TIMEOUT_MS })
    if (!res.ok) return null
    const body = (await res.json()) as { version?: string }
    if (!body || typeof body.version !== 'string') return null
    saveCache({ latestVersion: body.version, fetchedAt: Date.now() })
    return body.version
  } catch {
    return null
  }
}

async function runCheck(): Promise<ClaudeUpdateStatus> {
  try {
    // Run both lookups in parallel — they're independent. The npm fetch
    // is bounded by NPM_FETCH_TIMEOUT_MS; checkClaudeInstalled is
    // memoized after the first call.
    const [install, latest] = await Promise.all([
      checkClaudeInstalled(),
      fetchLatestFromNpm()
    ])

    if (!install.installed || !install.version) {
      return { updateAvailable: false, currentVersion: install.version }
    }

    if (!latest) {
      return {
        updateAvailable: false,
        currentVersion: install.version,
        error: 'Could not reach npm registry'
      }
    }

    return {
      updateAvailable: isVersionNewer(latest, install.version),
      currentVersion: install.version,
      latestVersion: latest
    }
  } catch (err) {
    return {
      updateAvailable: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export async function checkClaudeUpdates(): Promise<ClaudeUpdateStatus> {
  if (inflight) return inflight
  inflight = runCheck()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function invalidateClaudeUpdateCache(): void {
  memoryCache = null
  // Wipe the disk cache too so the next check refetches.
  getDiskStore().write({})
}
