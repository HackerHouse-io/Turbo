import { useState, useEffect } from 'react'
import { formatFileSize } from '../../lib/format'
import type { AttachmentInfo } from '../../../../shared/types'

const EXT_ICONS: Record<string, string> = {
  ts: 'TS', tsx: 'TX', js: 'JS', jsx: 'JX',
  py: 'PY', rs: 'RS', go: 'GO', rb: 'RB',
  json: '{}', md: 'MD', txt: 'TX', html: '<>',
  css: 'CS', yaml: 'YM', yml: 'YM', toml: 'TM',
  pdf: 'PF', sh: 'SH', swift: 'SW', kt: 'KT',
  java: 'JA', c: 'C', cpp: 'C+', h: 'H',
}

export function AttachmentChip({
  attachment,
  onRemove
}: {
  attachment: AttachmentInfo
  onRemove: (id: string) => void
}) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (attachment.isImage) {
      window.api.getThumbnail(attachment.filePath).then(url => {
        if (!cancelled) setThumbnail(url)
      })
    }
    return () => { cancelled = true }
  }, [attachment.filePath, attachment.isImage])

  const ext = attachment.fileName.split('.').pop()?.toLowerCase() || ''
  const extLabel = EXT_ICONS[ext] || ext.slice(0, 2).toUpperCase()

  return (
    <div className="inline-flex items-center gap-1.5 pl-1 pr-1 py-0.5 rounded-md
                    bg-turbo-bg/50 border border-turbo-border text-xs text-turbo-text-dim
                    group hover:border-turbo-border-bright transition-colors">
      {thumbnail ? (
        <img src={thumbnail} className="w-5 h-5 rounded object-cover flex-shrink-0" alt="" />
      ) : (
        <span className="w-5 h-5 rounded bg-turbo-surface flex items-center justify-center
                         text-[9px] font-bold text-turbo-text-muted flex-shrink-0">
          {extLabel}
        </span>
      )}
      <span className="max-w-[120px] truncate">{attachment.fileName}</span>
      <span className="text-turbo-text-muted text-[10px]">
        {formatFileSize(attachment.sizeBytes)}
      </span>
      <button
        onClick={() => onRemove(attachment.id)}
        className="w-4 h-4 flex items-center justify-center rounded
                   opacity-0 group-hover:opacity-100 hover:bg-turbo-surface-active
                   transition-all flex-shrink-0"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
