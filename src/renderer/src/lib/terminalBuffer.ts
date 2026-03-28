/**
 * Terminal data buffer — stores raw PTY output per session so that
 * XTermRenderer can replay missed data when it mounts after the session
 * has already started emitting.
 *
 * Stored outside React state to avoid re-renders on every data chunk.
 */

const MAX_BUFFER_SIZE = 512 * 1024 // 512 KB per session

const buffers = new Map<string, string>()

export function appendTerminalData(sessionId: string, data: string): void {
  const existing = buffers.get(sessionId) || ''
  let updated = existing + data
  // Trim from the front if over the cap
  if (updated.length > MAX_BUFFER_SIZE) {
    updated = updated.slice(updated.length - MAX_BUFFER_SIZE)
  }
  buffers.set(sessionId, updated)
}

export function getTerminalBuffer(sessionId: string): string {
  return buffers.get(sessionId) || ''
}

export function clearTerminalBuffer(sessionId: string): void {
  buffers.delete(sessionId)
}
