import { useEffect, useRef, useCallback } from 'react'

export type SettingsSection = 'general' | 'notifications' | 'quickActions' | 'keybindings' | 'git' | 'projects' | 'about'

interface SectionDef {
  id: SettingsSection
  label: string
  icon: React.ReactNode
}

const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    label: 'General',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    )
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    )
  },
  {
    id: 'quickActions',
    label: 'Quick Actions',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    )
  },
  {
    id: 'keybindings',
    label: 'Keyboard Shortcuts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    )
  },
  {
    id: 'git',
    label: 'Git',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 8.5v7m12-2.5c0 2.5-2 4-6 4h-0" />
      </svg>
    )
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    )
  },
  {
    id: 'about',
    label: 'About',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    )
  }
]

interface SettingsSidebarProps {
  active: SettingsSection
  onChange: (section: SettingsSection) => void
}

export function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  const navRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = SECTIONS.findIndex(s => s.id === active)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = SECTIONS[(idx + 1) % SECTIONS.length]
      onChange(next.id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length]
      onChange(next.id)
    }
  }, [active, onChange])

  useEffect(() => {
    navRef.current?.focus()
  }, [])

  return (
    <div
      ref={navRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-[200px] flex-shrink-0 border-r border-turbo-border py-3 px-2 outline-none"
    >
      <div className="space-y-0.5">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
              active === s.id
                ? 'bg-turbo-accent/10 text-turbo-accent border-l-2 border-turbo-accent pl-[10px]'
                : 'text-turbo-text-dim hover:bg-turbo-surface-hover hover:text-turbo-text'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
