import { useRef, useCallback, useState } from 'react'

interface UseDropZoneOptions {
  onDrop: (filePaths: string[]) => void
}

export function useDropZone({ onDrop }: UseDropZoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const counterRef = useRef(0)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counterRef.current++
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counterRef.current--
    if (counterRef.current <= 0) {
      counterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counterRef.current = 0
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer?.files || [])
    const paths = files.map(f => window.api.getPathForFile(f)).filter(Boolean)
    if (paths.length > 0) {
      onDropRef.current(paths)
    }
  }, [])

  return {
    isDragOver,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    }
  }
}
