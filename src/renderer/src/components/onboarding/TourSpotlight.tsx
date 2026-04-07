import { useState, useEffect, useCallback } from 'react'

interface TourSpotlightProps {
  selector: string
  padding?: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function sameRect(a: Rect | null, b: Rect): boolean {
  return a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

export function TourSpotlight({ selector, padding = 8 }: TourSpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null)

  const measure = useCallback(() => {
    const el = document.querySelector(selector)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    const next = { x: r.x, y: r.y, width: r.width, height: r.height }
    setRect(prev => (sameRect(prev, next) ? prev : next))
  }, [selector])

  useEffect(() => {
    measure()
    // ResizeObserver on body fires for window resize in a renderer that fills the window
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [measure])

  if (!rect) return null

  const cx = rect.x - padding
  const cy = rect.y - padding
  const cw = rect.width + padding * 2
  const ch = rect.height + padding * 2

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <mask id="tour-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={cx} y={cy} width={cw} height={ch} rx="10" fill="black" />
        </mask>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.65)"
        mask="url(#tour-spotlight-mask)"
      />

      <rect
        x={cx - 1}
        y={cy - 1}
        width={cw + 2}
        height={ch + 2}
        rx="11"
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.6;0.2;0.6"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  )
}
