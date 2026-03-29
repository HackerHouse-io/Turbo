import { PaletteIcon } from '../command-palette/PaletteIcon'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useUIStore } from '../../stores/useUIStore'

export function RoutinesCard() {
  const routines = useRoutineStore(s => s.routines)
  const openRoutineDetail = useUIStore(s => s.openRoutineDetail)
  const openRoutineEditor = useUIStore(s => s.openRoutineEditor)

  return (
    <div className="card p-4">
      <h3 className="text-xs font-medium text-turbo-text-muted uppercase tracking-wider mb-3">
        Routines
      </h3>

      <div className="space-y-0.5">
        {routines.map(r => (
          <button
            key={r.id}
            onClick={() => openRoutineDetail(r)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
                       hover:bg-turbo-surface-hover transition-colors text-left group"
          >
            <PaletteIcon
              icon={r.icon}
              className="w-4 h-4 text-turbo-text-muted group-hover:text-turbo-accent transition-colors"
            />
            <span className="text-xs font-medium text-turbo-text truncate flex-1">{r.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
              {r.steps.length}
            </span>
            {r.builtIn && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-turbo-accent/10 text-turbo-accent">
                built-in
              </span>
            )}
            <PaletteIcon
              icon="chevron-right"
              className="w-3 h-3 text-turbo-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>

      <button
        onClick={() => openRoutineEditor(null, 'create')}
        className="w-full flex items-center justify-center gap-1.5 mt-3 px-2.5 py-2 rounded-md
                   border border-dashed border-turbo-border text-turbo-text-muted
                   hover:border-turbo-accent/40 hover:text-turbo-accent transition-colors text-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Routine
      </button>
    </div>
  )
}
