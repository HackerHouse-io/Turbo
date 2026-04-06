<p align="center">
  <img src="assets/logo.png" alt="Turbo" width="128" />
</p>

<h1 align="center">Turbo</h1>

<p align="center">
  <strong>Orchestrate multiple Claude Code agents from a single command center.</strong>
</p>

<p align="center">
  <a href="https://github.com/HackerHouse-io/Turbo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-33-47848F.svg?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/react-18-61DAFB.svg?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/typescript-5.7-3178C6.svg?logo=typescript" alt="TypeScript" />
</p>

---

Turbo is a desktop app that lets you run multiple Claude Code sessions across multiple projects, simultaneously. Instead of one terminal and one agent, you get a full dashboard where every session is visible, controllable, and persistent.

## Why

Claude Code is powerful in a single terminal. But real work spans multiple repos, multiple tasks, multiple contexts. Turbo gives you the multiplayer version: launch agents in parallel, watch them work side by side, and step in only when they need you.

## What it does

**Run agents in parallel.** Start Claude Code sessions across different projects. Each one gets its own terminal, its own context, its own state. Pause one, resume another, kill what you don't need.

**See everything at once.** A split-pane workspace shows all your active sessions in real-time. Resizable, draggable terminals. No tab-switching, no window juggling.

**Stay in control.** An attention queue surfaces sessions that need your input. You see who's waiting, who's working, and who's done -- at a glance.

**Built-in git workflow.** Stage, commit, push, and switch branches without leaving the app. AI-generated commit messages. Per-project git identities.

**Interactive plans.** A PLAN.md editor with checkboxes, collapsible sections, and the ability to launch tasks directly from your plan.

**Command palette.** Fast switching between projects, actions, and git operations. Keyboard-first, fully configurable keybindings.

**Persistent sessions.** Close the app, reopen it, pick up where you left off. Terminal buffers, session history, and workspace layouts are all saved.

## Getting started

```bash
git clone https://github.com/HackerHouse-io/Turbo.git
cd Turbo
npm install
npm run dev
```

> Requires [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated.

### Build for distribution

```bash
npm run package         # macOS (dmg + zip)
npm run package:all     # macOS, Windows, Linux
```

## Architecture

Turbo is an Electron app with a React renderer and a Node.js main process that manages Claude Code sessions via PTY.

```
src/
  main/           Electron main process — session management, git, PTY, IPC
  renderer/       React UI — dashboard, terminals, command palette, settings
  shared/         Types and constants shared between processes
  preload/        Secure bridge between main and renderer
```

**Key dependencies:** Electron, React, Zustand, xterm.js, node-pty, Tailwind CSS, Framer Motion.

## License

[MIT](LICENSE) -- HackerHouse-io
