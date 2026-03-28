# Turbo: The 10x Developer Command Center

## Context: Why This Exists

There's a new breed of developer emerging. They make 90,000+ commits a year. Hundreds per day. They're not typing faster -- they're **orchestrating AI agents** to do the work while they think, review, and decide. They're CEOs of their own code.

But the tools haven't caught up. Today, a developer trying to work on 10 things at once with Claude Code faces:
- A graveyard of terminal windows they can't tell apart
- Re-typing the same prompts over and over
- Missing the moment Claude needs their input (and the agent sits idle for hours)
- No idea what's done, what's in progress, what's blocked
- Commits showing up as "Claude" instead of themselves
- Zero automation -- every workflow is manual, every time

**Turbo isn't a terminal manager.** It's a command center that makes a single developer feel like they have a team of 100. The developer becomes the **architect and reviewer** -- the agents do the building.

---

## The Core Experience Philosophy

### What Turbo is NOT
- Not a grid of terminals (that's iTerm2 with extra steps)
- Not a chatbot wrapper (that's every AI coding tool)
- Not a project management tool (that's Linear/Jira)
- Not a code editor (that's Cursor/VS Code)

### What Turbo IS
**A mission control center where the developer is the CEO.**

Think: Bloomberg Terminal meets Linear meets Warp. The developer sees:
- What every agent is working on RIGHT NOW (not raw terminal output)
- What needs their attention (prioritized inbox, not notification spam)
- What's done and ready for review (not buried in scroll history)
- What's next in the queue (not "what do I type now?")

---

## The Five Pillars of the Turbo Experience

### Pillar 1: Agent Cards (Not Terminals)
The primary UI unit is the Agent Card, not a terminal pane. Cards show collapsed state (dashboard view) and expanded state (detail view with Warp-style activity blocks).

### Pillar 2: The Attention Queue (Not Notifications)
A prioritized inbox: Decisions > Stuck Agents > Reviews > Completions. Each item shows enough context to act WITHOUT opening the full agent view.

### Pillar 3: Routines (Not Manual Prompts)
Saved workflows that turn multi-step processes into one-click operations. Built-in routines like Fix Issue, Feature Build, Bug Triage, Code Review, Refactor, Test Coverage.

### Pillar 4: The Prompt Vault (Not a Template List)
Command palette (Cmd+K) with smart suggestions, templates with {{variables}}, loadouts, and pattern learning.

### Pillar 5: The Project Nerve Center (Not a File Tree)
Single page showing project status, PLAN.md interactive view, agents, recent activity, and quick actions.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Electron | Cross-platform, native node-pty, mature |
| Frontend | React 18 + TypeScript | Concurrent features for smooth UI |
| Build | Vite (via electron-vite) | Fast HMR, excellent DX |
| Terminal | xterm.js + node-pty | Industry standard, used by VS Code |
| State | Zustand | Minimal API, sliced stores, React 18 compat |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Database | SQLite (better-sqlite3) | Relational, ACID, fast |
| Git | simple-git | Programmatic git from Node.js |
| Sessions | tmux | Persist sessions across app restarts |
| Packaging | electron-builder | macOS/Win/Linux, auto-update |
| Testing | Vitest + Playwright | Fast unit + E2E |
| Animations | Framer Motion | Smooth micro-interactions |
| Charts | Recharts | Lightweight usage charts |
| Markdown | remark + rehype | PLAN.md rendering |

---

## Architecture

```
RENDERER PROCESS
  React 18 + Zustand stores + xterm.js + Tailwind + Framer Motion
      |
      | Typed IPC (contextBridge, buffered at 60fps for terminal data)
      |
MAIN PROCESS
  ClaudeSessionManager    - Spawn/track/lifecycle Claude CLI processes
  OutputMonitor           - Pattern-match PTY output for status detection
  PtyManager + BufferPool - PTY lifecycle + 16ms frame buffering
  RoutineEngine           - Execute multi-step workflows
  GitManager + Attribution - Git ops + 4-layer attribution enforcement
  NotificationManager     - OS notifications + attention queue
  Database (SQLite)       - Projects, templates, routines, sessions, usage
  TmuxBridge              - Session persistence across app restarts
  SettingsManager         - App + Claude Code settings
  SkillManager / HookManager / McpManager
      |
CLAUDE CODE CLI POOL
  [agent1] [agent2] [agent3] ... [agentN]  (each in own PTY)
```

---

## Implementation Phases

### Phase 1: The Foundation (Weeks 1-3)
Goal: A working app where you can spawn multiple Claude Code agents and see their status as cards.

- Week 1: Electron + Vite + React + TypeScript scaffold. IPC infrastructure. App shell with dark theme.
- Week 2: node-pty + xterm.js integration. Spawn Claude Code CLI. Terminal drawer component.
- Week 3: Agent Cards with real-time status. OutputMonitor for state detection. Command Center layout with sections.

Deliverable: Open Turbo, spawn 3+ agents, see them as cards with live status, expand to see terminal.

### Phase 2: Projects + Git Attribution (Weeks 4-5)
Goal: Multi-project support. Every commit is yours.

### Phase 3: The Intelligence Layer (Weeks 6-7)
Goal: Attention Queue + Prompt Vault make you feel superhuman.

### Phase 4: Automation + Visualization (Weeks 8-11)
Goal: Routines, PLAN.md, Skills, Hooks, MCPs, Usage.

### Phase 5: Polish + Ship (Weeks 12-14)
Goal: Production quality. Session persistence. Remote. Ship v1.0.

---

## Verification Plan

### Phase 1 Verification
- Open Turbo -> see empty Command Center
- Click "+ New Agent" -> Claude Code starts in a card
- Card shows live status (starting -> active -> waiting -> etc.)
- Expand card -> see activity blocks (not just raw terminal)
- "Show Raw Terminal" -> interact with Claude Code directly
- Spawn 5+ agents -> all visible as cards on Command Center

### Phase 2 Verification
- Add 2+ existing projects -> switch between them
- Create new project from name only -> verify GitHub repo created
- Make a commit through an agent -> git log shows YOUR name
- Close and reopen Turbo -> projects and sessions still there

### Phase 3 Verification
- Agent asks for approval -> item appears in Attention Queue within 2 seconds
- Click "Respond Inline" -> type response -> agent resumes
- OS notification appears (when app is in background)
- Cmd+K -> type "fix" -> see matching templates and routines

### Phase 4 Verification
- Open PLAN.md view -> see interactive checklist
- Check an item -> file updates in repo
- Create routine -> run on GitHub issue -> agent creates branch, plans, implements
- Usage dashboard shows accurate token counts per project

### Phase 5 Verification
- Detach an agent -> close Turbo -> reopen -> reattach -> session continued
- Configure "Run App" -> click play -> app runs in dedicated terminal
- Package as DMG -> install on clean Mac -> full functionality
