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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                 bg-blue-500/15 text-blue-400 border border-blue-500/30
                 hover:bg-blue-500/25 transition-colors"
      title={tooltip}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.2 0L5.6 4H1.6L4.8 6.4L3.6 10.8L7.2 8L10.8 10.8L9.6 6.4L12.8 4H8.8L7.2 0Z" transform="translate(0.8, 0.5) scale(0.95)" />
      </svg>
      Xcode
    </button>
  )
}
