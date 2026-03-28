import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface XTermRendererProps {
  sessionId: string
}

export function XTermRenderer({ sessionId }: XTermRendererProps) {
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
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)
    fitAddon.fit()

    termRef.current = terminal
    fitRef.current = fitAddon

    // Send input to PTY via IPC
    terminal.onData((data) => {
      window.api.sendTerminalInput(sessionId, data)
    })

    // Receive output from PTY
    const unsubData = window.api.onTerminalData((sid, data) => {
      if (sid === sessionId) {
        terminal.write(data)
      }
    })

    // Send initial resize
    const { cols, rows } = terminal
    window.api.resizeTerminal(sessionId, cols, rows)

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      const { cols, rows } = terminal
      window.api.resizeTerminal(sessionId, cols, rows)
    })
    resizeObserver.observe(containerRef.current)

    // Focus terminal
    terminal.focus()

    return () => {
      unsubData()
      resizeObserver.disconnect()
      terminal.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [sessionId])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ padding: '4px' }}
    />
  )
}
