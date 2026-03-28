/**
 * Extract {{variable}} names from one or more template strings.
 * Used by PromptVaultManager, GitPresetManager, and RoutineManager.
 */
export function extractTemplateVariables(strings: string[]): string[] {
  const vars = new Set<string>()
  for (const s of strings) {
    for (const m of s.matchAll(/\{\{(\w+)\}\}/g)) {
      vars.add(m[1])
    }
  }
  return Array.from(vars)
}
