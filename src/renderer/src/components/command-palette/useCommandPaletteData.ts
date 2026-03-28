import { useState, useEffect } from 'react'
import type { PromptTemplate, PromptHistoryItem, GitPreset, ClaudeModelInfo, Routine } from '../../../../shared/types'

interface CommandPaletteData {
  templates: PromptTemplate[]
  history: PromptHistoryItem[]
  gitPresets: GitPreset[]
  routines: Routine[]
  models: ClaudeModelInfo[]
  loading: boolean
}

export function useCommandPaletteData(): CommandPaletteData {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [history, setHistory] = useState<PromptHistoryItem[]>([])
  const [gitPresets, setGitPresets] = useState<GitPreset[]>([])
  const [routines, setRoutines] = useState<Routine[]>([])
  const [models, setModels] = useState<ClaudeModelInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.listPromptTemplates(),
      window.api.listPromptHistory(),
      window.api.listGitPresets(),
      window.api.listRoutines(),
      window.api.detectModels()
    ]).then(([t, h, g, r, m]) => {
      setTemplates(t)
      setHistory(h)
      setGitPresets(g)
      setRoutines(r)
      setModels(m)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { templates, history, gitPresets, routines, models, loading }
}
