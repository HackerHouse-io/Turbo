import { useRef, useState, useCallback, useEffect } from 'react'

interface SplitContainerProps {
  direction: 'horizontal' | 'vertical'
  ratio: number
  onRatioChange: (ratio: number) => void
  first: React.ReactNode
  second: React.ReactNode
  className?: string
}

const MIN_PX = 80

export function SplitContainer({
  direction,
  ratio,
  onRatioChange,
  first,
  second,
  className = ''
}: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number>(0)
  const onRatioChangeRef = useRef(onRatioChange)
  const cleanupRef = useRef<(() => void) | null>(null)

  const isHorizontal = direction === 'horizontal'

  useEffect(() => {
    onRatioChangeRef.current = onRatioChange
  })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    setIsDragging(true)
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const total = isHorizontal ? rect.width : rect.height
        if (total <= 0) return

        const pos = isHorizontal ? ev.clientX - rect.left : ev.clientY - rect.top
        const minRatio = MIN_PX / total
        const maxRatio = 1 - minRatio
        const newRatio = Math.min(maxRatio, Math.max(minRatio, pos / total))
        onRatioChangeRef.current(newRatio)
      })
    }

    const cleanup = () => {
      cancelAnimationFrame(rafRef.current)
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', cleanup)
      cleanupRef.current = null
    }

    cleanupRef.current = cleanup
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', cleanup)
  }, [isHorizontal])

  const handleDoubleClick = useCallback(() => {
    onRatioChangeRef.current(0.5)
  }, [])

  // Clean up drag listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      cleanupRef.current?.()
    }
  }, [])

  const cursorClass = isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <div
        className="min-w-0 min-h-0 overflow-hidden"
        style={{ flexBasis: `${ratio * 100}%`, flexGrow: 0, flexShrink: 0 }}
      >
        {first}
      </div>

      <div
        className={`relative flex-shrink-0 group ${cursorClass}`}
        style={isHorizontal ? { width: '1px' } : { height: '1px' }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expanded hit area for easier grabbing */}
        <div
          className={`absolute z-10 ${cursorClass} ${
            isHorizontal
              ? 'top-0 bottom-0 -left-[3px] w-[7px]'
              : 'left-0 right-0 -top-[3px] h-[7px]'
          }`}
        />
        <div
          className={`absolute transition-colors ${
            isHorizontal
              ? 'top-0 bottom-0 left-0 w-[1px]'
              : 'left-0 right-0 top-0 h-[1px]'
          } ${
            isDragging
              ? 'bg-turbo-accent'
              : 'bg-turbo-border group-hover:bg-turbo-accent/50'
          }`}
        />
        <div
          className={`absolute z-10 flex ${isHorizontal ? 'flex-col' : 'flex-row'} gap-[3px] ${cursorClass}
            ${isHorizontal ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}
            opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? '!opacity-100' : ''}`}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`rounded-full ${isDragging ? 'bg-turbo-accent' : 'bg-turbo-text-muted'}`}
              style={{ width: 3, height: 3 }}
            />
          ))}
        </div>
      </div>

      <div className="min-w-0 min-h-0 overflow-hidden flex-1">
        {second}
      </div>

      {/* Prevents xterm from stealing mouse events during drag */}
      {isDragging && (
        <div className="fixed inset-0 z-50" style={{ cursor: isHorizontal ? 'col-resize' : 'row-resize' }} />
      )}
    </div>
  )
}
