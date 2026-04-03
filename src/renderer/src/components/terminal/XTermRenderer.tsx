import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { getTerminalBuffer, appendTerminalData } from '../../lib/terminalBuffer'
import '@xterm/xterm/css/xterm.css'

interface XTermRendererProps {
  terminalId: string
  mode?: 'session' | 'plain'
}

export function XTermRenderer({ terminalId, mode = 'session' }: XTermRendererProps) {
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

      // Send initial resize
      const { cols, rows } = terminal
      sendResize(terminalId, cols, rows)
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

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      safeFit()
      const { cols, rows } = terminal
      sendResize(terminalId, cols, rows)
    })
    resizeObserver.observe(containerRef.current)

    // Focus terminal — delay slightly so drawer animation settles
    terminal.focus()
    const focusTimer = setTimeout(() => terminal.focus(), 150)

    return () => {
      clearTimeout(focusTimer)
      unsubData()
      resizeObserver.disconnect()
      terminal.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId, mode])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ padding: '4px' }}
    />
  )
}
