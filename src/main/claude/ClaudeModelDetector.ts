import { execFile } from 'child_process'
import type {
  ClaudeCliOptions,
  ClaudeModelInfo,
  EffortLevel,
  EffortOption
} from '../../shared/types'
import { EFFORT_LEVELS } from '../../shared/constants'
import { getEnhancedEnv } from '../system/resolveShellPath'

const KNOWN_ALIASES: ClaudeModelInfo[] = [
  { alias: 'opus', label: 'Opus' },
  { alias: 'sonnet', label: 'Sonnet' },
  { alias: 'haiku', label: 'Haiku' }
]

const VERSION_RE = /(\d+\.\d+\.\d+(?:[-+][\w.]+)?)/

// Cache keyed by the claude CLI version — when the CLI is upgraded,
// the version changes and we transparently re-parse on the next call.
// When `claude --version` fails we fall back to a short TTL so we don't
// shell out on every call but also don't lock in stale data.
interface Cache {
  cliVersion: string | null
  options: ClaudeCliOptions
  fetchedAt: number
}

const FALLBACK_TTL_MS = 60_000

let cache: Cache | null = null
let inflight: Promise<ClaudeCliOptions> | null = null

function execClaude(args: string[], timeoutMs: number): Promise<string | null> {
  return new Promise(resolve => {
    execFile(
      'claude',
      args,
      { timeout: timeoutMs, env: getEnhancedEnv(), maxBuffer: 256 * 1024 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null)
          return
        }
        resolve(stdout)
      }
    )
  })
}

function parseCliVersion(out: string | null): string | null {
  if (!out) return null
  const m = out.match(VERSION_RE)
  return m ? m[1] : null
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Turn 'sonnet-4-5' → { short: 'sonnet', version: '4.5' }
// Turn 'sonnet'     → { short: 'sonnet', version: undefined }
function splitAlias(raw: string): { short: string; version?: string } {
  const dash = raw.indexOf('-')
  if (dash === -1) return { short: raw }
  const short = raw.slice(0, dash)
  const rest = raw.slice(dash + 1)
  // Convert 4-5 → 4.5; leave letter-containing suffixes alone (e.g. 'latest')
  const version = /^[\d-]+$/.test(rest) ? rest.replace(/-/g, '.') : rest
  return { short, version }
}

function parseModels(helpOutput: string): ClaudeModelInfo[] {
  const modelLine = helpOutput.split('\n').find(l => l.includes('--model'))
  if (!modelLine) return KNOWN_ALIASES

  // Accept aliases that may contain hyphens and digits (e.g. 'sonnet-4-5')
  const aliasMatches = modelLine.match(/'([a-z][a-z0-9-]*)'/g)
  if (!aliasMatches || aliasMatches.length === 0) return KNOWN_ALIASES

  const parsed = aliasMatches.map(m => m.replace(/'/g, ''))
  const knownMap = new Map(KNOWN_ALIASES.map(m => [m.alias, m]))

  // Index latest version per short alias
  const byShort = new Map<string, { version: string; fullName: string }>()
  const standaloneShorts: string[] = []

  for (const raw of parsed) {
    const { short, version } = splitAlias(raw)
    if (!version) {
      standaloneShorts.push(short)
      continue
    }
    // Keep the last-seen versioned entry for each short alias. `claude --help`
    // typically lists versions newest-first but either order is acceptable
    // because the renderer only displays a single label per alias.
    byShort.set(short, { version, fullName: raw })
  }

  const seen = new Set<string>()
  const models: ClaudeModelInfo[] = []

  const pushShort = (short: string) => {
    if (seen.has(short)) return
    seen.add(short)
    const known = knownMap.get(short)
    const baseLabel = known?.label ?? titleCase(short)
    const ver = byShort.get(short)
    if (ver) {
      models.push({
        alias: short,
        label: `${baseLabel} ${ver.version}`,
        version: ver.version,
        fullName: ver.fullName
      })
    } else {
      models.push({ alias: short, label: baseLabel })
    }
  }

  for (const short of standaloneShorts) pushShort(short)
  for (const short of byShort.keys()) pushShort(short)

  // Ensure every known alias is represented even if `--help` omitted it
  for (const known of KNOWN_ALIASES) {
    if (!seen.has(known.alias)) models.push(known)
  }

  return models
}

const KNOWN_EFFORTS = new Set<EffortLevel>(['low', 'medium', 'high', 'xhigh', 'max'])
const FALLBACK_EFFORTS: EffortOption[] = EFFORT_LEVELS.map(e => ({ value: e.value, label: e.label }))

function parseEfforts(helpOutput: string): EffortOption[] {
  // Look for an effort/thinking/reasoning flag line. Claude Code may not
  // expose this today — we fall back to the hardcoded set when absent so
  // behavior matches the old UI exactly.
  const lines = helpOutput.split('\n')
  const effortLine = lines.find(l =>
    /--(?:effort|thinking|reasoning)\b/.test(l)
  )
  if (!effortLine) return FALLBACK_EFFORTS

  const matches = effortLine.match(/'([a-z]+)'/g)
  if (!matches || matches.length === 0) return FALLBACK_EFFORTS

  const values = matches
    .map(m => m.replace(/'/g, ''))
    .filter((v): v is EffortLevel => KNOWN_EFFORTS.has(v as EffortLevel))

  if (values.length === 0) return FALLBACK_EFFORTS

  // Preserve the label styling of the hardcoded list for known values
  const labelByValue = new Map(FALLBACK_EFFORTS.map(e => [e.value, e.label]))
  return values.map(v => ({ value: v, label: labelByValue.get(v) ?? titleCase(v) }))
}

async function fetchOptions(): Promise<ClaudeCliOptions> {
  const [versionOut, helpOut] = await Promise.all([
    execClaude(['--version'], 5_000),
    execClaude(['--help'], 10_000)
  ])
  const cliVersion = parseCliVersion(versionOut)

  if (!helpOut) {
    return { models: KNOWN_ALIASES, efforts: FALLBACK_EFFORTS, cliVersion }
  }

  return {
    models: parseModels(helpOut),
    efforts: parseEfforts(helpOut),
    cliVersion
  }
}

/**
 * Detect available models + effort levels by parsing `claude --help`.
 * Cache is keyed by `claude --version` — when the CLI is upgraded the
 * cache transparently invalidates on the next call. If `--version` fails
 * we use a short TTL fallback.
 */
export async function detectClaudeOptions(): Promise<ClaudeCliOptions> {
  const now = Date.now()

  if (cache) {
    const { cliVersion, fetchedAt } = cache
    if (cliVersion) {
      // Probe version quickly; if unchanged, serve from cache
      const versionOut = await execClaude(['--version'], 5_000)
      const currentVersion = parseCliVersion(versionOut)
      if (currentVersion && currentVersion === cliVersion) return cache.options
      // Version changed or unavailable — fall through to re-fetch
    } else if (now - fetchedAt < FALLBACK_TTL_MS) {
      return cache.options
    }
  }

  if (inflight) return inflight

  inflight = fetchOptions().then(options => {
    cache = { cliVersion: options.cliVersion, options, fetchedAt: Date.now() }
    return options
  })

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/**
 * Back-compat shim: returns just the models list.
 * Prefer `detectClaudeOptions()` for new code.
 */
export async function detectModels(): Promise<ClaudeModelInfo[]> {
  const { models } = await detectClaudeOptions()
  return models
}

export function invalidateClaudeOptionsCache(): void {
  cache = null
}
