interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  vertical?: boolean
}

export function SettingRow({ label, description, children, vertical }: SettingRowProps) {
  if (vertical) {
    return (
      <div className="py-3 px-4">
        <div>
          <span className="text-sm text-turbo-text-dim">{label}</span>
          {description && (
            <p className="text-[11px] text-turbo-text-muted mt-0.5">{description}</p>
          )}
        </div>
        <div className="mt-2">{children}</div>
      </div>
    )
  }

  return (
    <div className="py-3 px-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="text-sm text-turbo-text-dim">{label}</span>
        {description && (
          <p className="text-[11px] text-turbo-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function SettingSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-turbo-text">{title}</h3>
      <p className="text-[12px] text-turbo-text-muted mt-0.5">{description}</p>
    </div>
  )
}
