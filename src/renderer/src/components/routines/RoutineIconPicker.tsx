import { PaletteIcon } from '../command-palette/PaletteIcon'

const ICONS = ['bug', 'bolt', 'test', 'eye', 'refresh', 'search', 'routine', 'task'] as const

interface RoutineIconPickerProps {
  selected: string
  onSelect: (icon: string) => void
}

export function RoutineIconPicker({ selected, onSelect }: RoutineIconPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ICONS.map(icon => (
        <button
          key={icon}
          type="button"
          onClick={() => onSelect(icon)}
          className={`p-2 rounded-md border transition-colors ${
            selected === icon
              ? 'bg-turbo-accent/20 border-turbo-accent/40 text-turbo-accent'
              : 'bg-turbo-surface border-turbo-border text-turbo-text-muted hover:border-turbo-accent/30'
          }`}
        >
          <PaletteIcon icon={icon} className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
