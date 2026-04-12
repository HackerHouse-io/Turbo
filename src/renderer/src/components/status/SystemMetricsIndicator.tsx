import { useState } from 'react'
import { useSystemMetricsStore } from '../../stores/useSystemMetricsStore'
import type { MetricCategory } from '../../../shared/types'

const CATEGORY_LABEL: Record<MetricCategory, string> = {
  main: 'Main',
  renderer: 'Renderer',
  gpu: 'GPU',
  utility: 'Utility',
  terminal: 'Shells',
  claude: 'Claude',
  other: 'Other'
}

function cpuColor(pct: number): string {
  if (pct < 30) return 'text-emerald-400'
  if (pct < 60) return 'text-amber-400'
  return 'text-red-400'
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}

export function SystemMetricsIndicator() {
  const current = useSystemMetricsStore((s) => s.current)
  const history = useSystemMetricsStore((s) => s.history)
  const [expanded, setExpanded] = useState(false)

  if (!current) return null

  const collecting = history.length < 2
  const cpuPct = Math.round(current.cpu.total)
  const memLabel = formatMemory(current.memory.totalMB)

  return (
    <div
      className="no-drag relative select-none"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full
                   bg-turbo-bg/80 backdrop-blur-sm
                   border border-turbo-border/40 hover:border-turbo-border-bright
                   text-[11px] font-mono transition-colors"
        aria-label="System resource usage"
        title="Turbo CPU & memory usage"
      >
        {collecting ? (
          <span className="text-turbo-text-muted">collecting…</span>
        ) : (
          <>
            <span className={cpuColor(cpuPct)}>CPU {cpuPct}%</span>
            <span className="text-turbo-text-muted">·</span>
            <span className="text-turbo-text-dim">{memLabel}</span>
          </>
        )}
      </button>

      {expanded && !collecting && (
        <div
          className="absolute bottom-full right-0 mb-2 w-80
                     bg-turbo-surface/95 backdrop-blur-md
                     border border-turbo-border/60 rounded-lg shadow-xl
                     p-3 text-[11px]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-turbo-text-muted uppercase tracking-wider text-[10px]">
              CPU (last {history.length * 2}s)
            </span>
            <span className={`font-mono ${cpuColor(cpuPct)}`}>{cpuPct}%</span>
          </div>
          <Sparkline points={history.map((h) => h.cpu)} />

          <div className="mt-3 mb-2 h-px bg-turbo-border/40" />
          <div className="text-turbo-text-muted uppercase tracking-wider text-[10px] mb-1.5">
            By category
          </div>
          <CategoryBars cpu={current.cpu.byCategory} total={Math.max(1, current.cpu.total)} />

          <div className="mt-3 mb-2 h-px bg-turbo-border/40" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-turbo-text-muted uppercase tracking-wider text-[10px]">
              Top processes
            </span>
            <span className="text-turbo-text-dim font-mono">total {memLabel}</span>
          </div>
          <ul className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {current.processes.slice(0, 10).map((p) => (
              <li
                key={`${p.pid}-${p.category}`}
                className="flex items-center justify-between font-mono gap-2"
              >
                <span className="truncate text-turbo-text-dim">
                  <span className="text-turbo-text-muted">{CATEGORY_LABEL[p.category]}</span>{' '}
                  {p.name}
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className={cpuColor(p.cpu)}>{p.cpu.toFixed(0)}%</span>
                  <span className="text-turbo-text-muted w-12 text-right">
                    {formatMemory(p.memoryMB)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="h-8 text-turbo-text-muted">collecting…</div>
  }
  const w = 300
  const h = 36
  const max = Math.max(100, ...points)
  const step = w / Math.max(1, points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - (p / max) * h).toFixed(1)}`)
    .join(' ')
  const area = `${d} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={area} fill="#6366f1" fillOpacity="0.12" />
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function CategoryBars({ cpu, total }: { cpu: Record<string, number>; total: number }) {
  const entries = Object.entries(cpu).filter(([, v]) => v > 0.1)
  if (entries.length === 0) {
    return <div className="text-turbo-text-muted">idle</div>
  }
  entries.sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-16 text-turbo-text-muted">
            {CATEGORY_LABEL[k as MetricCategory]}
          </span>
          <div className="flex-1 h-1.5 bg-turbo-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-turbo-accent"
              style={{ width: `${Math.min(100, (v / total) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-turbo-text-dim">
            {v.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
}
