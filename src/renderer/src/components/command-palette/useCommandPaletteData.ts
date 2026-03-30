import { useState, useEffect } from 'react'
import type { PromptHistoryItem, ClaudeModelInfo, Playbook } from '../../../../shared/types'
import { usePlaybookStore } from '../../stores/usePlaybookStore'

interface CommandPaletteData {
  history: PromptHistoryItem[]
  playbooks: Playbook[]
  models: ClaudeModelInfo[]
  loading: boolean
}

export function useCommandPaletteData(): CommandPaletteData {
  const [history, setHistory] = useState<PromptHistoryItem[]>([])
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const playbooks = usePlaybookStore(s => s.playbooks)

  useEffect(() => {
    Promise.all([
      window.api.listPromptHistory(),
      window.api.detectModels()
    ]).then(([h, m]) => {
      setHistory(h)
      setModels(m)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { history, playbooks, models, loading }
}
