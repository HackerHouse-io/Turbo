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

/**
 * Compare two `MAJOR.MINOR.PATCH` strings. Returns true if `a` is newer than `b`.
 * Pre-release/build metadata after `-` or `+` is stripped before comparison.
 */
export function isVersionNewer(a: string, b: string): boolean {
  const parse = (v: string) =>
    v.split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0)
  const [x = 0, y = 0, z = 0] = parse(a)
  const [p = 0, q = 0, r = 0] = parse(b)
  if (x !== p) return x > p
  if (y !== q) return y > q
  return z > r
}
