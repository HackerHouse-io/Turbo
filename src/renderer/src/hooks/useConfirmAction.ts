import { useState, useEffect, useCallback } from 'react'

/**
 * Two-step confirmation: first call arms, second call executes.
 * Auto-resets after `resetMs` (default 3s).
 */
export function useConfirmAction(onConfirm: () => void, resetMs = 3000) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), resetMs)
    return () => clearTimeout(t)
  }, [armed, resetMs])

  const trigger = useCallback(() => {
    if (!armed) {
      setArmed(true)
      return
    }
    onConfirm()
    setArmed(false)
  }, [armed, onConfirm])

  return { armed, trigger, reset: () => setArmed(false) }
}
