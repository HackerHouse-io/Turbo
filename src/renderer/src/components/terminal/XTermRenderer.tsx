import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { getTerminalBuffer, appendTerminalData } from '../../lib/terminalBuffer'
import '@xterm/xterm/css/xterm.css'

interface XTermRendererProps {
  terminalId: string
  mode?: 'session' | 'plain'
  showResume?: boolean
  onResume?: () => void
}

export function XTermRenderer({ terminalId, mode = 'session', showResume, onResume }: XTermRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create terminal
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Menlo', monospace",
      lineHeight: 1.4,
      theme: {
        background: '#0a0a0f',
        foreground: '#e4e4ef',
        cursor: '#e4e4ef',
        cursorAccent: '#0a0a0f',
        selectionBackground: '#6366f140',
        black: '#1a1a25',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4ef',
        brightBlack: '#55556a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      allowProposedApi: true,
      scrollback: 10_000
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)

    // WebGL renderer fixes cell-clearing artifacts under rapid TUI redraws
    // (Ink's plan-mode prompt stacks text on the default DOM renderer).
    let webglAddon: WebglAddon | null = null
    try {
      const addon = new WebglAddon()
      addon.onContextLoss(() => addon.dispose())
      terminal.loadAddon(addon)
      webglAddon = addon
    } catch (err) {
      console.warn('[XTermRenderer] WebGL renderer unavailable, falling back to DOM', err)
    }

    termRef.current = terminal
    fitRef.current = fitAddon

    // Safe fit helper — FitAddon crashes if container has zero dimensions
    const safeFit = () => {
      try {
        const el = containerRef.current
        if (el && el.clientWidth > 0 && el.clientHeight > 0) {
          fitAddon.fit()
        }
      } catch {
        // FitAddon can throw if element is detached
      }
    }

    // Resolve API functions once based on mode
    const sendInput = mode === 'plain' ? window.api.sendPlainTerminalInput : window.api.sendTerminalInput
    const sendResize = mode === 'plain' ? window.api.resizePlainTerminal : window.api.resizeTerminal
    const subscribeData = mode === 'plain' ? window.api.onPlainTerminalData : window.api.onTerminalData

    // Track last-sent PTY dims so we can skip no-op resize IPC during drags
    // where the container resizes but the cell grid lands on the same dims.
    let lastCols = 0
    let lastRows = 0
    const sendResizeIfChanged = () => {
      const { cols, rows } = terminal
      if (cols === lastCols && rows === lastRows) return
      lastCols = cols
      lastRows = rows
      sendResize(terminalId, cols, rows)
    }

    // Defer initial fit to next frame so layout is settled
    requestAnimationFrame(() => {
      safeFit()

      // Replay buffered data from before this terminal mounted
      const buffered = getTerminalBuffer(terminalId)
      if (buffered) {
        terminal.write(buffered)
      } else if (mode === 'session') {
        // No in-memory buffer — try loading persisted buffer from disk
        window.api.readTerminalBuffer(terminalId).then((persisted) => {
          if (persisted && termRef.current) {
            appendTerminalData(terminalId, persisted)
            termRef.current.write(persisted)
          }
        }).catch(() => { /* buffer replay failed, non-fatal */ })
      }

      sendResizeIfChanged()
    })

    // Send input to PTY via IPC
    terminal.onData((data) => {
      sendInput(terminalId, data)
    })

    // Receive output from PTY
    const unsubData = subscribeData((sid, data) => {
      if (sid === terminalId) {
        terminal.write(data)
      }
    })

    // Clear terminal when session is resumed
    const unsubClear = mode === 'session' ? window.api.onTerminalClear?.((sid) => {
      if (sid === terminalId) {
        terminal.reset()
      }
    }) : undefined

    // Coalesce resize bursts to one fit+IPC per frame so window drags don't
    // flood the PTY with SIGWINCHes mid-Ink-redraw.
    let resizePending = false
    const resizeObserver = new ResizeObserver(() => {
      if (resizePending) return
      resizePending = true
      requestAnimationFrame(() => {
        resizePending = false
        safeFit()
        sendResizeIfChanged()
      })
    })
    resizeObserver.observe(containerRef.current)

    // Restore scrollback position when window regains focus — xterm's renderer
    // can drift the viewport when waking from a blurred state.
    const handleWindowFocus = () => {
      const buf = terminal.buffer.active
      if (buf.viewportY >= buf.baseY) return
      const target = buf.viewportY
      requestAnimationFrame(() => {
        const current = terminal.buffer.active.viewportY
        if (current !== target) terminal.scrollLines(target - current)
      })
    }

    window.addEventListener('focus', handleWindowFocus)

    // Focus terminal — delay slightly so drawer animation settles
    terminal.focus()
    const focusTimer = setTimeout(() => terminal.focus(), 150)

    return () => {
      clearTimeout(focusTimer)
      unsubData()
      unsubClear?.()
      resizeObserver.disconnect()
      window.removeEventListener('focus', handleWindowFocus)
      // Dispose WebGL addon before the terminal — letting terminal.dispose()
      // cascade through the addon manager hits a known xterm teardown race.
      if (webglAddon) {
        try { webglAddon.dispose() } catch { /* xterm-internal teardown race */ }
      }
      terminal.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId, mode])

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ padding: '4px' }}
      />
      {showResume && onResume && (
        <div className="absolute bottom-4 right-4 group/resume">
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-turbo-accent text-white text-xs font-medium
                       hover:bg-turbo-accent/90 transition-colors shadow-lg"
          >
            Resume
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </button>
          <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-md bg-turbo-surface border border-turbo-border
                          text-[11px] text-turbo-text-dim whitespace-nowrap shadow-lg
                          opacity-0 group-hover/resume:opacity-100 pointer-events-none transition-opacity">
            Resume this session where it left off
          </div>
        </div>
      )}
    </div>
  )
}
