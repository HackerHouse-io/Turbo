import { readFileSync, statSync, readdirSync } from 'fs'
import { join } from 'path'
import { getEnhancedEnv } from '../system/resolveShellPath'
import { execFileAsync as execFilePromise } from '../utils/execFileAsync'

export interface DetectResult {
  command: string
  source: string
  sourceMtime?: number
}

/** Wrap a value in single quotes, escaping embedded single quotes for shell safety. */
function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/** Try to read a file's mtime. Returns null if the file doesn't exist or is unreadable. */
function getMtime(filePath: string): number | null {
  try {
    return statSync(filePath).mtimeMs
  } catch {
    return null
  }
}

/** Try to read and parse a JSON file. Returns null on failure. */
function readJsonFile(filePath: string): any | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Detect Xcode project/workspace and return a run command.
 */
async function detectXcode(
  entries: string[],
  projectPath: string,
  ext: '.xcworkspace' | '.xcodeproj',
  flag: '-workspace' | '-project',
  sourceLabel: string
): Promise<DetectResult | null> {
  const match = entries.find(e => e.endsWith(ext))
  if (!match) return null

  const fullPath = join(projectPath, match)
  const mtime = getMtime(fullPath) ?? Date.now()
  const scheme = await detectXcodeScheme(projectPath, flag, fullPath)

  if (scheme) {
    return {
      command: `xcodebuild ${flag} ${shellQuote(match)} -scheme ${shellQuote(scheme)} -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build`,
      source: sourceLabel,
      sourceMtime: mtime
    }
  }
  return {
    command: `open ${shellQuote(fullPath)}`,
    source: sourceLabel,
    sourceMtime: mtime
  }
}

/**
 * Tier 1: File-based detection — async (xcodebuild calls are async to avoid blocking main process).
 */
export async function detectRunCommand(projectPath: string): Promise<DetectResult | null> {
  // 1. package.json
  const pkgPath = join(projectPath, 'package.json')
  const pkg = readJsonFile(pkgPath)
  if (pkg) {
    const mtime = getMtime(pkgPath)!

    // React Native
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps['react-native']) {
      return { command: 'npx react-native run-ios', source: 'package.json', sourceMtime: mtime }
    }

    // Scripts: dev, start, serve
    if (pkg.scripts) {
      for (const script of ['dev', 'start', 'serve']) {
        if (pkg.scripts[script]) {
          return { command: `npm run ${script}`, source: 'package.json', sourceMtime: mtime }
        }
      }
    }
  }

  // 2. pubspec.yaml (Flutter)
  const pubspecMtime = getMtime(join(projectPath, 'pubspec.yaml'))
  if (pubspecMtime !== null) {
    return { command: 'flutter run', source: 'pubspec.yaml', sourceMtime: pubspecMtime }
  }

  // Read directory once for remaining checks
  let entries: string[]
  try {
    entries = readdirSync(projectPath)
  } catch {
    return null
  }

  // 3. .xcworkspace
  const xcws = await detectXcode(entries, projectPath, '.xcworkspace', '-workspace', 'xcworkspace')
  if (xcws) return xcws

  // 4. .xcodeproj
  const xcp = await detectXcode(entries, projectPath, '.xcodeproj', '-project', 'xcodeproj')
  if (xcp) return xcp

  // 5–8. Simple file → command mapping
  const simpleChecks: [string, string, string][] = [
    ['Makefile', 'make', 'Makefile'],
    ['Cargo.toml', 'cargo run', 'Cargo.toml'],
    ['go.mod', 'go run .', 'go.mod'],
    ['pyproject.toml', 'python -m pytest', 'pyproject.toml'],
  ]
  for (const [file, command, source] of simpleChecks) {
    const mtime = getMtime(join(projectPath, file))
    if (mtime !== null) {
      return { command, source, sourceMtime: mtime }
    }
  }

  return null
}

/**
 * Extract the first Xcode scheme via xcodebuild -list -json (async — does not block main process).
 */
async function detectXcodeScheme(cwd: string, flag: string, path: string): Promise<string | null> {
  try {
    const result = await execFilePromise('xcodebuild', ['-list', '-json', flag, path], {
      cwd,
      timeout: 15_000,
      maxBuffer: 512 * 1024
    })
    const data = JSON.parse(result.stdout)
    const schemes: string[] =
      data?.project?.schemes || data?.workspace?.schemes || []
    return schemes[0] || null
  } catch {
    return null
  }
}

/**
 * Tier 2: Claude AI fallback — async.
 */
export async function detectRunCommandWithClaude(projectPath: string): Promise<{ command: string } | null> {
  try {
    const files = readdirSync(projectPath)
      .filter(f => !f.startsWith('.'))
      .slice(0, 30)
      .join(', ')

    const prompt = `You are analyzing a software project at this path. The top-level files are: ${files}\n\nDetermine the single terminal command to run this project in development mode. If it's an iOS project, include the simulator launch command. Output ONLY the command, nothing else.`

    const result = await execFilePromise('claude', ['-p', prompt], {
      cwd: projectPath,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      env: getEnhancedEnv()
    })

    const command = result.stdout
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
      .trim()

    return command ? { command } : null
  } catch {
    return null
  }
}
