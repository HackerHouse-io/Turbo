import { useState, useEffect } from 'react'
import type { PromptTemplate, PromptHistoryItem } from '../../../../shared/types'

interface CommandPaletteData {
  templates: PromptTemplate[]
  history: PromptHistoryItem[]
  loading: boolean
}

export function useCommandPaletteData(): CommandPaletteData {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [history, setHistory] = useState<PromptHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.listPromptTemplates(),
      window.api.listPromptHistory()
    ]).then(([t, h]) => {
      setTemplates(t)
      setHistory(h)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return { templates, history, loading }
}
