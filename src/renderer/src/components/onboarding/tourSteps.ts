import type { IllustrationKey } from './tourIllustrations'

export interface TourStepDef {
  id: string
  title: string
  description: string
  illustration: IllustrationKey
  spotlightSelector?: string
  spotlightPadding?: number
  shortcuts?: string[]
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to Turbo',
    description:
      'Turbo orchestrates multiple Claude Code AI agents across your projects. Launch tasks, monitor sessions in real-time, and ship code faster than ever.',
    illustration: 'welcome'
  },
  {
    id: 'topbar',
    title: 'The Top Bar',
    description:
      'Your command center. Switch projects, search commands, manage your git identity, and access settings — all from this bar.',
    illustration: 'topbar',
    spotlightSelector: '[data-tour="topbar"]',
    spotlightPadding: 4
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description:
      'Press **⌘K** to open the Command Palette. Search for any action, switch projects, manage git operations, or jump to sessions instantly.',
    illustration: 'command-palette',
    spotlightSelector: '[data-tour="command-palette"]',
    spotlightPadding: 6,
    shortcuts: ['⌘K']
  },
  {
    id: 'sidebar',
    title: 'Session Sidebar',
    description:
      'All your Claude sessions appear on the left. Active sessions show live status indicators. Click any session to focus it in the terminal grid.',
    illustration: 'sidebar'
  },
  {
    id: 'terminal-grid',
    title: 'Terminal Grid',
    description:
      'Up to 4 Claude sessions run side-by-side in resizable split panes. Each pane shows real-time terminal output of a Claude Code agent working on your task.',
    illustration: 'terminal-grid'
  },
  {
    id: 'inline-prompt',
    title: 'The Prompt Bar',
    description:
      'This is where you tell Claude what to do. Type your task, drag in files for context, pick a model, and press **⌘↵** to launch a new session.',
    illustration: 'inline-prompt',
    shortcuts: ['⌘↵']
  },
  {
    id: 'git-panel',
    title: 'Git Panel',
    description:
      'Toggle with **⌘G**. Quick-commit, push, pull & rebase, or Ship It — all without leaving Turbo. Full git workflow at your fingertips.',
    illustration: 'git-panel',
    shortcuts: ['⌘G', '⌘⇧C', '⌘⇧P', '⌘⇧L', '⌘⇧S']
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description:
      'Turbo is built for keyboard-first workflows. Open terminals with **⌃`**, project overview with **⌘⇧O**, timeline with **⌘⇧T**, and more. Press **⌘/** anytime to see all shortcuts.',
    illustration: 'shortcuts',
    spotlightSelector: '[data-tour="shortcuts"]',
    spotlightPadding: 6,
    shortcuts: ['⌘/', '⌃`', '⌘⇧O', '⌘⇧T']
  },
  {
    id: 'ready',
    title: "You're All Set!",
    description:
      'Start by adding a project folder, then type what you want to work on in the prompt bar. Turbo handles the rest.\n\nYou can always restart this tour from **Settings → General**.',
    illustration: 'ready'
  }
]
