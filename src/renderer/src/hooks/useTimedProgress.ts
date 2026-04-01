import { useMemo } from 'react'
import type { AgentSession } from '../../../shared/types'
import { useSharedTick } from './useSharedTick'

/** Logarithmic curve: fast early, asymptotic approach to 90% */
function timeToProgress(ms: number): number {
  const s = ms / 1000
  return Math.min(90, (Math.log(1 + s / 10) / Math.log(61)) * 90)
}

/** Returns a 0–100 progress value that updates every second for active sessions. */
export function useTimedProgress(session: AgentSession): number {
  const now = useSharedTick()
  return useMemo(() => {
    if (session.status === 'completed') return 100
    const isActive = session.status === 'active' || session.status === 'starting'
    if (!isActive) return timeToProgress(Date.now() - session.startedAt)
    return timeToProgress(now - session.startedAt)
  }, [session.status, session.startedAt, now])
}
