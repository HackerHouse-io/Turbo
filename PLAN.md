# Turbo — Project Roadmap

> The ultimate desktop app for orchestrating multiple Claude Code CLI sessions across projects.

## Phase 1: Foundation
- [x] Electron scaffold with Vite + React + TypeScript
- [x] IPC infrastructure (shared types, constants, preload bridge)
- [x] App shell with dark theme and traffic-light titlebar
- [x] Project management (add, remove, select, scan)
- [x] Settings manager with persistent storage

## Phase 2: Core Session Management
- [x] Claude CLI session lifecycle (create, stop, pause, resume)
- [x] PTY-based terminal integration
- [x] Activity block parsing (read, edit, write, bash, search, etc.)
- [x] Real-time session status updates via IPC events
- [x] Attention queue for sessions needing input

## Phase 3: Developer Experience
- [x] Command palette with templates, routines, and git presets
- [x] Prompt vault (save, reuse, history)
- [x] Git identity management (global + per-project overrides)
- [x] Git operations (stage, commit, push, pull, AI commit messages)
- [x] Routines engine (multi-step automated workflows)
- [x] Nerve Center dashboard with git status and recent commits

## Phase 4: Interactive Views
- [x] Interactive PLAN.md viewer with inline editing
- [ ] Session timeline / Gantt view
- [ ] Multi-project dashboard overview
- [x] Settings screen

## Phase 5: Collaboration & Polish
- [ ] Shareable routine templates
- [ ] Keyboard shortcut customization
- [ ] Performance profiling and optimization
- [ ] Notification system for long-running tasks

## Phase 6: Distribution
- [ ] Code signing and notarization (macOS)
- [ ] Auto-update mechanism
- [ ] Linux and Windows packaging
- [ ] Landing page and documentation site
