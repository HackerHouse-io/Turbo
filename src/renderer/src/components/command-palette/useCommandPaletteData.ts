import { useState, useEffect } from 'react'
import type { PromptHistoryItem, GitPreset, ClaudeModelInfo, Playbook } from '../../../../shared/types'
import { usePlaybookStore } from '../../stores/usePlaybookStore'

interface CommandPaletteData {
  history: PromptHistoryItem[]
  gitPresets: GitPreset[]
  playbooks: Playbook[]
  models: ClaudeModelInfo[]
  loading: boolean
}

export function useCommandPaletteData(): CommandPaletteData {
  const [history, setHistory] = useState<PromptHistoryItem[]>([])
  const [gitPresets, setGitPresets] = useState<GitPreset[]>([])
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const playbooks = usePlaybookStore(s => s.playbooks)

  useEffect(() => {
    Promise.all([
      window.api.listPromptHistory(),
      window.api.listGitPresets(),
      window.api.detectModels()
    ]).then(([h, g, m]) => {
      setHistory(h)
      setGitPresets(g)
      setModels(m)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { history, gitPresets, playbooks, models, loading }
}
