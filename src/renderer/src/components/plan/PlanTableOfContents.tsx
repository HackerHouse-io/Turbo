import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PlanSection } from '../../lib/planParser'

interface PlanTableOfContentsProps {
  sections: PlanSection[]
}

export function PlanTableOfContents({ sections }: PlanTableOfContentsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleClick = useCallback((index: number) => {
    const el = document.getElementById(`plan-section-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Stabilize observer — only recreate when sections are added/removed/renamed
  const sectionFingerprint = useMemo(
    () => sections.map(s => s.heading.content).join('\n'),
    [sections]
  )

  // Track active section via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-section-index'))
            if (!isNaN(idx)) setActiveIndex(idx)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    observerRef.current = observer

    sections.forEach((_, i) => {
      const el = document.getElementById(`plan-section-${i}`)
      if (el) {
        el.setAttribute('data-section-index', String(i))
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [sectionFingerprint]) // eslint-disable-line react-hooks/exhaustive-deps

  if (sections.length === 0) return null

  return (
    <nav className="space-y-0.5">
      <p className="text-[10px] font-medium text-turbo-text-muted uppercase tracking-wider mb-2 px-2">
        Contents
      </p>
      {sections.map((section, i) => {
        const { totalTasks, completedTasks } = section
        const isActive = i === activeIndex
        const isComplete = totalTasks > 0 && completedTasks === totalTasks
        const hasProgress = totalTasks > 0

        let indicator = ''
        if (isComplete) indicator = '\u2713'
        else if (hasProgress && completedTasks > 0) indicator = '\u25D0'
        else if (hasProgress) indicator = '\u25CB'

        return (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-full text-left px-2 py-1 rounded text-[11px] leading-snug transition-colors flex items-start gap-1.5 ${
              isActive
                ? 'text-turbo-accent bg-turbo-accent/10'
                : 'text-turbo-text-dim hover:text-turbo-text hover:bg-white/5'
            }`}
          >
            {indicator && (
              <span className={`flex-shrink-0 text-[10px] mt-px ${
                isComplete ? 'text-emerald-400' : 'text-turbo-text-muted'
              }`}>
                {indicator}
              </span>
            )}
            <span className="flex-1 truncate">{section.heading.content}</span>
            {hasProgress && (
              <span className="text-[9px] text-turbo-text-muted flex-shrink-0 mt-px">
                {completedTasks}/{totalTasks}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
