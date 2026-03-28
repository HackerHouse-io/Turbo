import { execFile } from 'child_process'
import type { ClaudeModelInfo } from '../../shared/types'

const KNOWN_ALIASES: ClaudeModelInfo[] = [
  { alias: 'opus', label: 'Opus' },
  { alias: 'sonnet', label: 'Sonnet' },
  { alias: 'haiku', label: 'Haiku' }
]

let cachedModels: ClaudeModelInfo[] | null = null

/**
 * Detect available model aliases by parsing `claude --help`.
 * Falls back to known aliases if parsing fails.
 * Results are cached for the process lifetime.
 */
export function detectModels(): Promise<ClaudeModelInfo[]> {
  if (cachedModels) return Promise.resolve(cachedModels)

  return new Promise(resolve => {
    execFile('claude', ['--help'], { timeout: 10_000 }, (err, stdout) => {
      if (err || !stdout) {
        cachedModels = KNOWN_ALIASES
        resolve(cachedModels)
        return
      }

      // Parse the --model line: e.g. "Provide an alias for the latest model (e.g. 'sonnet' or 'opus')"
      const modelLine = stdout.split('\n').find(l => l.includes('--model'))
      if (!modelLine) {
        cachedModels = KNOWN_ALIASES
        resolve(cachedModels)
        return
      }

      // Extract quoted aliases from the help text
      const aliasMatches = modelLine.match(/'([a-z]+)'/g)
      if (aliasMatches && aliasMatches.length > 0) {
        const parsed = aliasMatches
          .map(m => m.replace(/'/g, ''))
          .filter(a => !a.includes('-')) // only short aliases, not full model IDs

        // Build model list, keeping known labels where possible
        const knownMap = new Map(KNOWN_ALIASES.map(m => [m.alias, m]))
        const models: ClaudeModelInfo[] = []
        const seen = new Set<string>()

        for (const alias of parsed) {
          if (seen.has(alias)) continue
          seen.add(alias)
          const known = knownMap.get(alias)
          models.push(known || { alias, label: alias.charAt(0).toUpperCase() + alias.slice(1) })
        }

        // Ensure all known aliases are represented
        for (const known of KNOWN_ALIASES) {
          if (!seen.has(known.alias)) {
            models.push(known)
          }
        }

        cachedModels = models
      } else {
        cachedModels = KNOWN_ALIASES
      }

      resolve(cachedModels)
    })
  })
}
