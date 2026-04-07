/**
 * `fetch` with an `AbortController`-backed timeout. Resolves with the
 * Response on success and throws on network error, abort, or timeout.
 *
 * Defaults to 5s. Pass a custom `timeoutMs` to override.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 5000, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
