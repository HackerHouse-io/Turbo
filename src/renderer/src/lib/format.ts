export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function camelToTitle(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

export function formatCost(cost: number): string {
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`
}

export function formatElapsed(start: number, end?: number): string {
  const ms = (end || Date.now()) - start
  return formatDuration(ms)
}

export const CMD_ENTER_LABEL = (navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl') + '+\u21B5'

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Wrap a value in single quotes, escaping embedded single quotes for shell safety. */
export function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
