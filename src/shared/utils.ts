/**
 * Convert text to a URL-safe slug.
 * Lowercase, replace non-alphanumeric with hyphens, strip leading/trailing hyphens, truncate to 50 chars.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}
