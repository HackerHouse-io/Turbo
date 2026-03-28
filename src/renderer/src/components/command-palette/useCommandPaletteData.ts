import { useState, useEffect } from 'react'
import type { PromptTemplate, PromptHistoryItem, GitPreset, ClaudeModelInfo } from '../../../../shared/types'

interface CommandPaletteData {
  templates: PromptTemplate[]
  history: PromptHistoryItem[]
  gitPresets: GitPreset[]
  models: ClaudeModelInfo[]
  loading: boolean
}

export function useCommandPaletteData(): CommandPaletteData {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [history, setHistory] = useState<PromptHistoryItem[]>([])
  const [gitPresets, setGitPresets] = useState<GitPreset[]>([])
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.listPromptTemplates(),
      window.api.listPromptHistory(),
      window.api.listGitPresets(),
      window.api.detectModels()
    ]).then(([t, h, g, m]) => {
      setTemplates(t)
      setHistory(h)
      setGitPresets(g)
      setModels(m)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { templates, history, gitPresets, models, loading }
}
