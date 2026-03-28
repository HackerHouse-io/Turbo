import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityBlock as ActivityBlockType } from '../../../../shared/types'

interface ActivityBlockProps {
  block: ActivityBlockType
}

const BLOCK_ICONS: Record<string, string> = {
  read: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  edit: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  write: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  bash: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  plan: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  think: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  message: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
  tool: 'M11.42 15.17l-5.648 5.648a2.25 2.25 0 01-3.182 0l-.475-.475a2.25 2.25 0 010-3.182l5.648-5.648m3.657 3.657a2.25 2.25 0 003.182 0l3.536-3.536a2.25 2.25 0 000-3.182l-.475-.475a2.25 2.25 0 00-3.182 0L12.96 8.52a2.25 2.25 0 000 3.182l-.54.537z',
  unknown: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z'
}

const BLOCK_COLORS: Record<string, string> = {
  read: 'text-turbo-info',
  edit: 'text-turbo-warning',
  write: 'text-turbo-success',
  bash: 'text-turbo-accent',
  search: 'text-turbo-info',
  plan: 'text-purple-400',
  think: 'text-purple-400',
  message: 'text-turbo-text-dim',
  tool: 'text-turbo-accent',
  unknown: 'text-turbo-text-muted'
}

export function ActivityBlock({ block }: ActivityBlockProps) {
  const [expanded, setExpanded] = useState(!block.collapsed)
  const iconPath = BLOCK_ICONS[block.type] || BLOCK_ICONS.unknown
  const colorClass = BLOCK_COLORS[block.type] || BLOCK_COLORS.unknown

  const duration = block.duration
    ? block.duration < 1000
      ? `${block.duration}ms`
      : `${(block.duration / 1000).toFixed(1)}s`
    : 'now'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-0 overflow-hidden"
    >
      {/* Block header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-turbo-surface-hover transition-colors text-left"
      >
        <svg
          className={`w-4 h-4 flex-shrink-0 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
        <span className="text-xs font-medium text-turbo-text flex-1 truncate">
          {block.title}
        </span>
        {block.files && block.files.length > 0 && (
          <span className="text-[10px] text-turbo-text-muted">
            {block.files.length} file{block.files.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-[10px] text-turbo-text-muted font-mono">{duration}</span>
        <svg
          className={`w-3 h-3 text-turbo-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Block content */}
      <AnimatePresence>
        {expanded && block.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 border-t border-turbo-border/50">
              <pre className="text-xs font-mono text-turbo-text-dim whitespace-pre-wrap leading-relaxed mt-2 max-h-48 overflow-y-auto">
                {block.content}
              </pre>
              {block.files && block.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {block.files.map(f => (
                    <span
                      key={f}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-turbo-surface-active text-turbo-text-dim"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
