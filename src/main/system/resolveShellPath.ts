import { homedir } from 'os'
import { delimiter } from 'path'

/**
 * When Electron is launched from Finder/Dock on macOS, `process.env.PATH`
 * is stripped down to `/usr/bin:/bin:/usr/sbin:/sbin` — Homebrew, npm
 * global, Volta, asdf, etc. are all missing. This breaks `claude` and
 * any other dev-tool spawn that doesn't live in those four directories.
 *
 * `getEnhancedPath()` returns a PATH string that's the union of the
 * inherited PATH plus a static list of well-known install locations.
 * Static probing is intentional: spawning a login shell is slow and
 * fragile, and these directories cover >95% of real installs.
 */

const COMMON_BIN_DIRS = (() => {
  const home = homedir()
  return [
    '/opt/homebrew/bin',          // Apple Silicon Homebrew
    '/opt/homebrew/sbin',
    '/usr/local/bin',             // Intel Homebrew + classic /usr/local
    '/usr/local/sbin',
    `${home}/.local/bin`,         // pip --user, pipx, generic local installs
    `${home}/.npm-global/bin`,    // npm global with custom prefix
    `${home}/.volta/bin`,         // Volta toolchain manager
    `${home}/.asdf/shims`,        // asdf version manager
    `${home}/.bun/bin`,           // Bun
    `${home}/.cargo/bin`,         // Rust toolchain
    `${home}/.deno/bin`,          // Deno
    '/opt/local/bin',             // MacPorts
  ]
})()

let cachedPath: string | null = null
let cachedBaseEnv: Record<string, string> | null = null

export function getEnhancedPath(): string {
  if (cachedPath !== null) return cachedPath

  const current = process.env.PATH || ''
  const existing = new Set(current.split(delimiter).filter(Boolean))

  const additions: string[] = []
  for (const dir of COMMON_BIN_DIRS) {
    if (!existing.has(dir)) additions.push(dir)
  }

  cachedPath = additions.length > 0
    ? `${current}${current ? delimiter : ''}${additions.join(delimiter)}`
    : current

  return cachedPath
}

/**
 * Build an env object suitable for `child_process` / `node-pty` spawn
 * options. Merges the enhanced PATH onto the inherited environment.
 *
 * The base env (no extras) is memoized: every spawn site rebuilding
 * a `{ ...process.env }` clone wastes allocations on a hot path.
 */
export function getEnhancedEnv(extra?: Record<string, string>): Record<string, string> {
  if (!extra) {
    if (cachedBaseEnv) return cachedBaseEnv
    cachedBaseEnv = { ...process.env, PATH: getEnhancedPath() } as Record<string, string>
    return cachedBaseEnv
  }
  return { ...process.env, ...extra, PATH: getEnhancedPath() } as Record<string, string>
}
