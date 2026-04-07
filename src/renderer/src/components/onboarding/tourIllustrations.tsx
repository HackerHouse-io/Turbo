/** Stylized SVG illustrations for each onboarding tour step.
 *  Uses the turbo color palette so they feel native to the app. */

type KeyRowItem = { label: string; desc: string }

const C = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  surfaceActive: '#22222f',
  border: '#2a2a3a',
  borderBright: '#3a3a4f',
  text: '#e4e4ef',
  textDim: '#9d9db5',
  textMuted: '#727288',
  accent: '#6366f1',
  accentHover: '#818cf8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export function WelcomeIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={C.bg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={C.surface} rx="12" />
      <circle cx="200" cy="100" r="90" fill="url(#glow)" />
      {/* Turbo logo shape - stylized T */}
      <rect x="170" y="60" width="60" height="8" rx="4" fill={C.accent} />
      <rect x="196" y="60" width="8" height="70" rx="4" fill={C.accent} />
      {/* Orbiting dots representing agents */}
      <circle cx="140" cy="80" r="6" fill={C.success} opacity="0.8" />
      <circle cx="260" cy="80" r="6" fill={C.accentHover} opacity="0.8" />
      <circle cx="160" cy="140" r="5" fill={C.warning} opacity="0.7" />
      <circle cx="240" cy="140" r="5" fill={C.success} opacity="0.7" />
      {/* Connection lines */}
      <line x1="146" y1="80" x2="190" y2="90" stroke={C.border} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="254" y1="80" x2="210" y2="90" stroke={C.border} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="165" y1="140" x2="195" y2="125" stroke={C.border} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="235" y1="140" x2="205" y2="125" stroke={C.border} strokeWidth="1" strokeDasharray="3 3" />
      {/* Label */}
      <text x="200" y="175" textAnchor="middle" fill={C.textMuted} fontSize="11" fontFamily="Inter, system-ui">
        AI Agent Orchestrator
      </text>
    </svg>
  )
}

export function TopBarIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* Top bar mock */}
      <rect x="20" y="30" width="360" height="40" rx="8" fill={C.surfaceActive} stroke={C.borderBright} strokeWidth="1" />
      {/* Logo */}
      <rect x="32" y="42" width="16" height="16" rx="4" fill={C.accent} />
      <text x="55" y="54" fill={C.text} fontSize="10" fontWeight="600" fontFamily="Inter, system-ui">Turbo</text>
      {/* Project selector */}
      <rect x="90" y="40" width="80" height="20" rx="4" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      <circle cx="100" cy="50" r="3" fill={C.success} />
      <text x="108" y="54" fill={C.text} fontSize="8" fontFamily="Inter, system-ui">my-project</text>
      {/* Search bar */}
      <rect x="180" y="40" width="100" height="20" rx="4" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      <text x="192" y="54" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Search... ⌘K</text>
      {/* Action buttons */}
      <rect x="295" y="43" width="14" height="14" rx="3" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      <rect x="315" y="43" width="14" height="14" rx="3" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      <rect x="335" y="43" width="14" height="14" rx="3" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      <circle cx="362" cy="50" r="7" fill={C.bg} stroke={C.borderBright} strokeWidth="0.5" />
      {/* Labels */}
      <text x="42" y="95" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Logo</text>
      <text x="105" y="95" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Projects</text>
      <text x="210" y="95" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Commands</text>
      <text x="310" y="95" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Actions</text>
      {/* Descriptive elements below */}
      <rect x="30" y="115" width="340" height="60" rx="8" fill={C.surfaceActive} stroke={C.borderBright} strokeWidth="0.5" />
      <text x="50" y="140" fill={C.text} fontSize="9" fontFamily="Inter, system-ui">Project Selector</text>
      <text x="50" y="155" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Switch between projects with one click</text>
      <text x="230" y="140" fill={C.text} fontSize="9" fontFamily="Inter, system-ui">Git Identity</text>
      <text x="230" y="155" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Manage who you commit as</text>
    </svg>
  )
}

export function CommandPaletteIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* Dimmed background */}
      <rect x="20" y="15" width="360" height="170" rx="8" fill={C.surface} opacity="0.3" />
      {/* Palette modal */}
      <rect x="60" y="30" width="280" height="140" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />
      {/* Search input */}
      <rect x="75" y="45" width="250" height="28" rx="6" fill={C.bg} stroke={C.borderBright} strokeWidth="1" />
      <text x="90" y="63" fill={C.textMuted} fontSize="10" fontFamily="Inter, system-ui">Type a command or search...</text>
      {/* Results */}
      <rect x="75" y="82" width="250" height="22" rx="4" fill={C.accent} fillOpacity="0.1" />
      <circle cx="90" cy="93" r="4" fill={C.accent} />
      <text x="100" y="96" fill={C.text} fontSize="9" fontFamily="Inter, system-ui">New Shell Terminal</text>
      <rect x="75" y="108" width="250" height="22" rx="4" fill="transparent" />
      <circle cx="90" cy="119" r="4" fill={C.success} />
      <text x="100" y="122" fill={C.textDim} fontSize="9" fontFamily="Inter, system-ui">Quick Commit</text>
      <rect x="75" y="134" width="250" height="22" rx="4" fill="transparent" />
      <circle cx="90" cy="145" r="4" fill={C.warning} />
      <text x="100" y="148" fill={C.textDim} fontSize="9" fontFamily="Inter, system-ui">Switch Project</text>
    </svg>
  )
}

export function SidebarIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* Sidebar panel */}
      <rect x="20" y="20" width="140" height="160" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
      {/* Header */}
      <text x="35" y="42" fill={C.text} fontSize="10" fontWeight="600" fontFamily="Inter, system-ui">Sessions</text>
      {/* Session items */}
      <rect x="30" y="52" width="120" height="28" rx="5" fill={C.accent} fillOpacity="0.1" />
      <circle cx="42" cy="66" r="4" fill={C.success} />
      <text x="52" y="63" fill={C.text} fontSize="8" fontFamily="Inter, system-ui">Fix login bug</text>
      <text x="52" y="73" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">Active - 2m ago</text>

      <rect x="30" y="84" width="120" height="28" rx="5" fill="transparent" />
      <circle cx="42" cy="98" r="4" fill={C.accent} />
      <text x="52" y="95" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Add dark mode</text>
      <text x="52" y="105" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">Active - 5m ago</text>

      <rect x="30" y="116" width="120" height="28" rx="5" fill="transparent" />
      <circle cx="42" cy="130" r="4" fill={C.textMuted} />
      <text x="52" y="127" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Refactor API</text>
      <text x="52" y="137" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">Completed</text>

      {/* Separator line to "main content" */}
      <line x1="160" y1="20" x2="160" y2="180" stroke={C.border} strokeWidth="1" />

      {/* Main area placeholder */}
      <rect x="170" y="20" width="210" height="160" rx="8" fill={C.surface} opacity="0.3" />
      <text x="275" y="100" textAnchor="middle" fill={C.textMuted} fontSize="9" fontFamily="Inter, system-ui">Terminal Grid</text>

      {/* Arrow pointing to sidebar */}
      <path d="M85 190 L85 182" stroke={C.accent} strokeWidth="1.5" />
      <text x="85" y="198" textAnchor="middle" fill={C.accent} fontSize="8" fontFamily="Inter, system-ui">Sessions live here</text>
    </svg>
  )
}

export function TerminalGridIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* 4-pane grid */}
      {/* Top-left */}
      <rect x="25" y="20" width="170" height="75" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
      <rect x="32" y="27" width="60" height="5" rx="2" fill={C.success} opacity="0.6" />
      <text x="35" y="45" fill={C.textMuted} fontSize="7" fontFamily="JetBrains Mono, monospace">$ claude "fix login"</text>
      <text x="35" y="55" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Reading src/auth.ts...</text>
      <text x="35" y="65" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Editing line 42...</text>
      <rect x="35" y="72" width="40" height="3" rx="1" fill={C.accent} opacity="0.5" />

      {/* Top-right */}
      <rect x="205" y="20" width="170" height="75" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
      <rect x="212" y="27" width="60" height="5" rx="2" fill={C.accent} opacity="0.6" />
      <text x="215" y="45" fill={C.textMuted} fontSize="7" fontFamily="JetBrains Mono, monospace">$ claude "add tests"</text>
      <text x="215" y="55" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Creating test file...</text>
      <text x="215" y="65" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Writing 12 tests...</text>
      <rect x="215" y="72" width="55" height="3" rx="1" fill={C.accent} opacity="0.5" />

      {/* Bottom-left */}
      <rect x="25" y="105" width="170" height="75" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
      <rect x="32" y="112" width="60" height="5" rx="2" fill={C.warning} opacity="0.6" />
      <text x="35" y="130" fill={C.textMuted} fontSize="7" fontFamily="JetBrains Mono, monospace">$ claude "review PR"</text>
      <text x="35" y="140" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Analyzing 8 files...</text>
      <rect x="35" y="150" width="30" height="3" rx="1" fill={C.warning} opacity="0.5" />

      {/* Bottom-right */}
      <rect x="205" y="105" width="170" height="75" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
      <rect x="212" y="112" width="60" height="5" rx="2" fill={C.success} opacity="0.6" />
      <text x="215" y="130" fill={C.textMuted} fontSize="7" fontFamily="JetBrains Mono, monospace">$ claude "update docs"</text>
      <text x="215" y="140" fill={C.textDim} fontSize="7" fontFamily="JetBrains Mono, monospace">Done! Updated README</text>
      <rect x="212" y="150" width="156" height="3" rx="1" fill={C.success} opacity="0.4" />

      {/* Resize handle indicator */}
      <circle cx="200" cy="100" r="8" fill={C.surfaceHover} stroke={C.borderBright} strokeWidth="1" />
      <line x1="196" y1="98" x2="204" y2="98" stroke={C.textMuted} strokeWidth="1" />
      <line x1="196" y1="102" x2="204" y2="102" stroke={C.textMuted} strokeWidth="1" />
    </svg>
  )
}

export function InlinePromptIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* Terminal area (dimmed) */}
      <rect x="20" y="15" width="360" height="95" rx="8" fill={C.surface} opacity="0.3" />
      <text x="200" y="65" textAnchor="middle" fill={C.textMuted} fontSize="9" fontFamily="Inter, system-ui">Terminal Grid above</text>
      {/* Separator */}
      <line x1="20" y1="118" x2="380" y2="118" stroke={C.border} strokeWidth="1" strokeOpacity="0.5" />
      {/* Prompt bar */}
      <rect x="30" y="125" width="340" height="55" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />
      {/* Input text */}
      <text x="50" y="148" fill={C.textDim} fontSize="10" fontFamily="Inter, system-ui">Fix the authentication bug in login flow</text>
      <rect x="48" y="152" width="1" height="12" fill={C.accent}>
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>
      {/* Bottom row: model, intent, submit */}
      <rect x="45" y="158" width="50" height="14" rx="3" fill={C.surfaceHover} />
      <text x="55" y="168" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">Opus</text>
      <rect x="100" y="158" width="50" height="14" rx="3" fill={C.surfaceHover} />
      <text x="110" y="168" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">Code</text>
      {/* Submit button */}
      <rect x="310" y="155" width="50" height="18" rx="5" fill={C.accent} />
      <text x="335" y="167" textAnchor="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="Inter, system-ui">⌘↵</text>
    </svg>
  )
}

export function GitPanelIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      {/* Main area (dimmed) */}
      <rect x="20" y="20" width="230" height="160" rx="8" fill={C.surface} opacity="0.3" />
      <text x="135" y="100" textAnchor="middle" fill={C.textMuted} fontSize="9" fontFamily="Inter, system-ui">Main Content</text>
      {/* Separator */}
      <line x1="260" y1="20" x2="260" y2="180" stroke={C.border} strokeWidth="1" />
      {/* Git panel */}
      <rect x="268" y="20" width="112" height="160" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
      <text x="280" y="42" fill={C.text} fontSize="10" fontWeight="600" fontFamily="Inter, system-ui">Git</text>
      {/* Quick actions */}
      <rect x="278" y="52" width="92" height="22" rx="4" fill={C.surfaceHover} />
      <text x="290" y="66" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Commit</text>
      <text x="350" y="66" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">⌘⇧C</text>

      <rect x="278" y="78" width="92" height="22" rx="4" fill={C.surfaceHover} />
      <text x="290" y="92" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Push</text>
      <text x="350" y="92" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">⌘⇧P</text>

      <rect x="278" y="104" width="92" height="22" rx="4" fill={C.surfaceHover} />
      <text x="290" y="118" fill={C.textDim} fontSize="8" fontFamily="Inter, system-ui">Pull</text>
      <text x="350" y="118" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">⌘⇧L</text>

      <rect x="278" y="130" width="92" height="22" rx="4" fill={C.accent} fillOpacity="0.15" />
      <text x="290" y="144" fill={C.accent} fontSize="8" fontWeight="500" fontFamily="Inter, system-ui">Ship It</text>
      <text x="350" y="144" fill={C.accent} fontSize="7" opacity="0.7" fontFamily="Inter, system-ui">⌘⇧S</text>
    </svg>
  )
}

function KeyRow({ y, color, keys }: { y: number; color: string; keys: KeyRowItem[] }) {
  return (
    <g transform={`translate(60, ${y})`}>
      {keys.map((k, i) => (
        <g key={k.label} transform={`translate(${i * 95}, 0)`}>
          <rect width="80" height="36" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
          <text x="40" y="18" textAnchor="middle" fill={color} fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">{k.label}</text>
          <text x="40" y="30" textAnchor="middle" fill={C.textMuted} fontSize="7" fontFamily="Inter, system-ui">{k.desc}</text>
        </g>
      ))}
    </g>
  )
}

export function ShortcutsIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill={C.surface} rx="12" />
      <KeyRow y={30} color={C.accent} keys={[
        { label: '⌘K', desc: 'Commands' },
        { label: '⌘G', desc: 'Git Panel' },
        { label: '⌘/', desc: 'Shortcuts' },
      ]} />
      <KeyRow y={78} color={C.accentHover} keys={[
        { label: '⌃`', desc: 'Terminals' },
        { label: '⌘⇧O', desc: 'Overview' },
        { label: '⌘⇧T', desc: 'Timeline' },
      ]} />
      <KeyRow y={126} color={C.success} keys={[
        { label: '⌘⇧C', desc: 'Commit' },
        { label: '⌘⇧P', desc: 'Push' },
        { label: '⌘⇧S', desc: 'Ship It' },
      ]} />
      <text x="200" y="185" textAnchor="middle" fill={C.textMuted} fontSize="8" fontFamily="Inter, system-ui">
        Press ⌘/ anytime to see all shortcuts
      </text>
    </svg>
  )
}

export function ReadyIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="readyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.success} stopOpacity="0.12" />
          <stop offset="100%" stopColor={C.bg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={C.surface} rx="12" />
      <circle cx="200" cy="85" r="80" fill="url(#readyGlow)" />
      {/* Checkmark circle */}
      <circle cx="200" cy="80" r="30" fill={C.surface} stroke={C.success} strokeWidth="2" />
      <path d="M186 80 L195 89 L214 70" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Sparkles */}
      <circle cx="155" cy="55" r="2" fill={C.accent} opacity="0.6" />
      <circle cx="245" cy="60" r="2.5" fill={C.accentHover} opacity="0.5" />
      <circle cx="160" cy="110" r="1.5" fill={C.warning} opacity="0.5" />
      <circle cx="240" cy="105" r="2" fill={C.success} opacity="0.4" />
      {/* Text */}
      <text x="200" y="135" textAnchor="middle" fill={C.text} fontSize="12" fontWeight="600" fontFamily="Inter, system-ui">
        Ready to build!
      </text>
      <text x="200" y="152" textAnchor="middle" fill={C.textMuted} fontSize="9" fontFamily="Inter, system-ui">
        Add a project and start your first session
      </text>
    </svg>
  )
}

export const ILLUSTRATIONS = {
  welcome: WelcomeIllustration,
  topbar: TopBarIllustration,
  'command-palette': CommandPaletteIllustration,
  sidebar: SidebarIllustration,
  'terminal-grid': TerminalGridIllustration,
  'inline-prompt': InlinePromptIllustration,
  'git-panel': GitPanelIllustration,
  shortcuts: ShortcutsIllustration,
  ready: ReadyIllustration,
} as const

export type IllustrationKey = keyof typeof ILLUSTRATIONS
