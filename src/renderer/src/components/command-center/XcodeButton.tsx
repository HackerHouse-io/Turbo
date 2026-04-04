import { useState, useEffect, useRef } from 'react'
import type { XcodeProjectInfo } from '../../../../shared/types'

interface XcodeButtonProps {
  projectPath: string | undefined
}

export function XcodeButton({ projectPath }: XcodeButtonProps) {
  const [info, setInfo] = useState<XcodeProjectInfo | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    generationRef.current++
    const gen = generationRef.current
    setInfo(null)

    if (!projectPath) return

    window.api.detectXcodeProject(projectPath).then(result => {
      if (gen === generationRef.current) setInfo(result)
    }).catch(() => {})
  }, [projectPath])

  if (!info) return null

  const platformLabel = info.platform ? ` (${info.platform})` : ''
  const tooltip = `Open ${info.name} in Xcode${platformLabel}`

  const handleClick = async () => {
    try {
      await window.api.openInXcode(info.openPath)
    } catch (err) {
      console.error('Failed to open in Xcode:', err)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
                 bg-blue-500/10 text-blue-400 border border-blue-500/25
                 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer"
      title={tooltip}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      </svg>
      <span>Xcode</span>
      {info.platform && (
        <span className="text-blue-400/60">{info.platform}</span>
      )}
    </button>
  )
}
