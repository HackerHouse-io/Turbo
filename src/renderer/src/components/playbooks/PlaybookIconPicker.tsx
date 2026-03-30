import { PaletteIcon, type PaletteIconName } from '../command-palette/PaletteIcon'

const ICONS: PaletteIconName[] = ['bug', 'bolt', 'test', 'eye', 'refresh', 'search', 'phone', 'playbook', 'task']

interface PlaybookIconPickerProps {
  selected: string
  onSelect: (icon: string) => void
}

export function PlaybookIconPicker({ selected, onSelect }: PlaybookIconPickerProps) {
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
