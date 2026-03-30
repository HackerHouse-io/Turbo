// ─── Keyboard shortcut utilities ─────────────────────────────

export interface ParsedShortcut {
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  key: string
}

const isMac = navigator.platform.toUpperCase().includes('MAC')

/** Parse a shortcut string like "meta+shift+o" into its parts */
export function parseShortcut(s: string): ParsedShortcut {
  const parts = s.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  return {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('meta'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key
  }
}

/** Check whether a KeyboardEvent matches a shortcut string. Returns false for null shortcuts. */
export function matchesEvent(shortcut: string | null, e: KeyboardEvent): boolean {
  if (!shortcut) return false
  const p = parseShortcut(shortcut)

  // "meta" means metaKey on Mac, ctrlKey elsewhere (matching original AppShell convention)
  const metaHeld = p.meta ? (e.metaKey || e.ctrlKey) : false
  const ctrlHeld = p.ctrl ? e.ctrlKey : false
  const modifiersMatch =
    (p.meta ? metaHeld : !(e.metaKey && !p.ctrl)) &&
    (p.ctrl ? ctrlHeld : !(e.ctrlKey && !p.meta)) &&
    p.alt === e.altKey &&
    p.shift === e.shiftKey

  if (!modifiersMatch) return false

  // For special keys like backtick, compare against event.code fallback
  const eventKey = e.key.toLowerCase()
  if (p.key === eventKey) return true
  // Backtick / backquote
  if (p.key === '`' && e.code === 'Backquote') return true
  // Slash
  if (p.key === '/' && e.code === 'Slash') return true
  // Letter keys — compare with code (e.g. shift changes e.key to uppercase)
  if (p.key.length === 1 && p.key >= 'a' && p.key <= 'z') {
    return e.code === `Key${p.key.toUpperCase()}`
  }
  return false
}

const MAC_SYMBOLS: Record<string, string> = {
  meta: '\u2318', ctrl: '\u2303', alt: '\u2325', shift: '\u21E7',
  enter: '\u21A9', backspace: '\u232B', delete: '\u2326',
  escape: '\u238B', tab: '\u21E5', ' ': '\u2423',
  arrowup: '\u2191', arrowdown: '\u2193', arrowleft: '\u2190', arrowright: '\u2192',
  '`': '`', '/': '/', ',': ',', '.': '.', '-': '-', '=': '=',
  '[': '[', ']': ']', '\\': '\\'
}

/** Format a shortcut for display: "⌘K" on Mac, "Ctrl+K" elsewhere. Returns "—" for null. */
export function formatShortcutLabel(shortcut: string | null): string {
  if (!shortcut) return '\u2014'
  const p = parseShortcut(shortcut)
  if (isMac) {
    let label = ''
    if (p.ctrl) label += MAC_SYMBOLS.ctrl
    if (p.meta) label += MAC_SYMBOLS.meta
    if (p.alt) label += MAC_SYMBOLS.alt
    if (p.shift) label += MAC_SYMBOLS.shift
    label += p.key.length === 1 ? p.key.toUpperCase() : (MAC_SYMBOLS[p.key] ?? p.key)
    return label
  }
  const parts: string[] = []
  if (p.ctrl) parts.push('Ctrl')
  if (p.meta) parts.push('Ctrl')
  if (p.alt) parts.push('Alt')
  if (p.shift) parts.push('Shift')
  parts.push(p.key.length === 1 ? p.key.toUpperCase() : p.key)
  return parts.join('+')
}

/** Serialize a KeyboardEvent to canonical shortcut string, or null if only modifiers pressed */
export function serializeFromEvent(e: KeyboardEvent): string | null {
  const key = e.key.toLowerCase()
  // Ignore pure-modifier presses
  if (['control', 'meta', 'alt', 'shift'].includes(key)) return null

  const parts: string[] = []
  if (e.ctrlKey && !e.metaKey) parts.push('ctrl')
  if (e.metaKey) parts.push('meta')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  // Normalize key
  if (e.code === 'Backquote') parts.push('`')
  else if (e.code === 'Slash') parts.push('/')
  else if (e.code === 'Comma') parts.push(',')
  else if (e.code === 'Period') parts.push('.')
  else if (e.code === 'Minus') parts.push('-')
  else if (e.code === 'Equal') parts.push('=')
  else if (e.code.startsWith('Key')) parts.push(e.code.slice(3).toLowerCase())
  else if (e.code.startsWith('Digit')) parts.push(e.code.slice(5))
  else parts.push(key)

  return parts.join('+')
}
