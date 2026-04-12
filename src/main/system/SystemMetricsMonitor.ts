import { app, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'
import pidusage from 'pidusage'
import { IPC } from '../../shared/constants'
import type {
  SystemMetrics,
  ProcessMetric,
  CategoryBreakdown,
  MetricCategory
} from '../../shared/types'

export interface TrackedPid {
  pid: number
  kind: 'terminal' | 'claude'
  label?: string
}

export interface SystemMetricsMonitorOptions {
  intervalMs?: number
  getTrackedPids: () => TrackedPid[]
  getMainWindow: () => BrowserWindow | null
  maxProcesses?: number
}

export class SystemMetricsMonitor extends EventEmitter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private latest: SystemMetrics | null = null
  private running = false
  private sampling = false
  private readonly intervalMs: number
  private readonly maxProcesses: number
  private boundWindow: BrowserWindow | null = null

  constructor(private opts: SystemMetricsMonitorOptions) {
    super()
    this.intervalMs = opts.intervalMs ?? 2000
    this.maxProcesses = opts.maxProcesses ?? 20
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.bindVisibilityListeners()
    this.scheduleNext(0)
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.unbindVisibilityListeners()
  }

  getSnapshot(): SystemMetrics | null {
    return this.latest
  }

  private bindVisibilityListeners(): void {
    const win = this.opts.getMainWindow()
    if (!win || win.isDestroyed()) return
    this.boundWindow = win
    win.on('hide', this.onHidden)
    win.on('minimize', this.onHidden)
    win.on('show', this.onVisible)
    win.on('restore', this.onVisible)
    win.once('closed', this.onClosed)
  }

  private unbindVisibilityListeners(): void {
    const win = this.boundWindow
    if (!win || win.isDestroyed()) {
      this.boundWindow = null
      return
    }
    win.removeListener('hide', this.onHidden)
    win.removeListener('minimize', this.onHidden)
    win.removeListener('show', this.onVisible)
    win.removeListener('restore', this.onVisible)
    this.boundWindow = null
  }

  private onHidden = (): void => {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private onVisible = (): void => {
    if (this.running && !this.timer) this.scheduleNext(0)
  }

  private onClosed = (): void => {
    this.boundWindow = null
    this.stop()
  }

  private scheduleNext(delay: number): void {
    if (!this.running) return
    const win = this.opts.getMainWindow()
    if (!win || win.isDestroyed() || !win.isVisible()) {
      this.timer = setTimeout(() => this.scheduleNext(0), 5000)
      return
    }
    this.timer = setTimeout(() => {
      void this.sampleAndBroadcast()
    }, delay)
  }

  private async sampleAndBroadcast(): Promise<void> {
    if (this.sampling) {
      this.scheduleNext(this.intervalMs)
      return
    }
    this.sampling = true
    const started = Date.now()
    try {
      const metrics = await this.sample()
      this.latest = metrics
      const win = this.opts.getMainWindow()
      if (win && !win.isDestroyed() && win.isVisible()) {
        win.webContents.send(IPC.SYSTEM_METRICS_UPDATE, metrics)
      }
      this.emit('metrics', metrics)
    } catch (err) {
      console.error('[SystemMetricsMonitor] sample failed:', err)
    } finally {
      this.sampling = false
      const elapsed = Date.now() - started
      const next = Math.max(250, this.intervalMs - elapsed)
      this.scheduleNext(next)
    }
  }

  private async sample(): Promise<SystemMetrics> {
    const ts = Date.now()
    const sampleStart = ts

    const electronProcs: ProcessMetric[] = app.getAppMetrics().map((m) => {
      const memKB = m.memory?.workingSetSize ?? 0
      return {
        pid: m.pid,
        category: mapElectronType(m.type),
        name: electronLabel(m.type, m.name),
        cpu: m.cpu?.percentCPUUsage ?? 0,
        memoryMB: memKB / 1024
      }
    })

    const termProcs = await this.sampleTrackedPids()

    const all: ProcessMetric[] = [...electronProcs, ...termProcs]
    all.sort((a, b) => b.cpu - a.cpu)

    const cpuByCategory = emptyBreakdown()
    const memByCategory = emptyBreakdown()
    let totalCpu = 0
    let totalMem = 0
    for (const p of all) {
      cpuByCategory[p.category] += p.cpu
      memByCategory[p.category] += p.memoryMB
      totalCpu += p.cpu
      totalMem += p.memoryMB
    }

    return {
      timestamp: ts,
      sampleDurationMs: Date.now() - sampleStart,
      cpu: { total: round1(totalCpu), byCategory: roundBreakdown(cpuByCategory) },
      memory: { totalMB: round1(totalMem), byCategory: roundBreakdown(memByCategory) },
      processes: all.slice(0, this.maxProcesses).map((p) => ({
        ...p,
        cpu: round1(p.cpu),
        memoryMB: round1(p.memoryMB)
      }))
    }
  }

  private async sampleTrackedPids(): Promise<ProcessMetric[]> {
    const tracked = this.opts.getTrackedPids()
    if (tracked.length === 0) return []

    const result: ProcessMetric[] = []
    const pids = tracked.map((t) => t.pid)

    try {
      const stats = await pidusage(pids)
      for (const t of tracked) {
        const s = stats[t.pid]
        if (!s) continue
        result.push(toProcessMetric(t, s.cpu, s.memory))
      }
      return result
    } catch {
      // Batch call failed — likely because one PID has exited.
      // Fall back to per-PID calls so one dead process doesn't drop the rest.
      for (const t of tracked) {
        try {
          const s = await pidusage(t.pid)
          result.push(toProcessMetric(t, s.cpu, s.memory))
        } catch {
          // Process gone between tracking and sampling — skip.
        }
      }
      return result
    }
  }
}

function toProcessMetric(t: TrackedPid, cpu: number, memoryBytes: number): ProcessMetric {
  return {
    pid: t.pid,
    category: t.kind,
    name: t.label ?? (t.kind === 'claude' ? 'claude' : 'shell'),
    cpu: cpu || 0,
    memoryMB: (memoryBytes || 0) / (1024 * 1024)
  }
}

function emptyBreakdown(): CategoryBreakdown {
  return {
    main: 0,
    renderer: 0,
    gpu: 0,
    utility: 0,
    terminal: 0,
    claude: 0,
    other: 0
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function roundBreakdown(b: CategoryBreakdown): CategoryBreakdown {
  const out = emptyBreakdown()
  for (const k of Object.keys(b) as MetricCategory[]) {
    out[k] = round1(b[k])
  }
  return out
}

function mapElectronType(type: string): MetricCategory {
  switch (type) {
    case 'Browser':
      return 'main'
    case 'Tab':
    case 'Renderer':
      return 'renderer'
    case 'GPU':
      return 'gpu'
    case 'Utility':
    case 'Zygote':
    case 'Sandbox helper':
    case 'Pepper Plugin':
    case 'Pepper Plugin Broker':
    case 'Plugin':
      return 'utility'
    default:
      return 'other'
  }
}

function electronLabel(type: string, name?: string): string {
  if (type === 'Browser') return 'main'
  if (type === 'Renderer' || type === 'Tab') return name && name.length > 0 ? name : 'renderer'
  return name && name.length > 0 ? name : type
}
