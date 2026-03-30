/**
 * Extract {{variable}} names from one or more template strings.
 * Used by GitPresetManager and PlaybookManager.
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

/**
 * Replace {{variable}} placeholders in a string with values from a map.
 * Used by PlaybookExecutor and CommandPaletteGitPresetFill.
 */
export function substituteTemplateVariables(
  template: string,
  variables: Record<string, string>,
  fallback?: (key: string) => string
): string {
  let result = template
  for (const [key, val] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, val || (fallback ? fallback(key) : ''))
  }
  return result
}
