import { useEffect, useRef, useState } from 'react'
import { ReadyIllustration } from './tourIllustrations'
import { TourCard } from './TourCard'
import { Spinner } from '../common/Spinner'
import { useTourStore, type ClaudeStatus } from '../../stores/useTourStore'
import { CLAUDE_INSTALL_DOCS_URL, CLAUDE_INSTALL_COMMAND } from '../../../../shared/constants'

interface ReadyStepProps {
  status: ClaudeStatus
  currentIndex: number
  totalSteps: number
  onPrev: () => void
  onFinish: () => void
}

export function ReadyStep({ status, currentIndex, totalSteps, onPrev, onFinish }: ReadyStepProps) {
  const isMissing = status.state === 'missing'

  const actions = (
    <>
      <button
        onClick={onPrev}
        className="h-8 px-3 rounded-lg text-xs font-medium border border-turbo-border
                   text-turbo-text-dim hover:text-turbo-text hover:bg-turbo-surface-hover
                   transition-colors"
      >
        Back
      </button>
      <button
        onClick={onFinish}
        disabled={status.state === 'checking'}
        className="h-8 px-4 rounded-lg text-xs font-medium bg-turbo-accent hover:bg-turbo-accent-hover
                   text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMissing ? 'Continue with plain terminals' : 'Get Started'}
      </button>
    </>
  )

  return (
    <TourCard
      cardKey="ready"
      illustration={isMissing ? <InstallIllustration /> : <ReadyIllustration />}
      currentIndex={currentIndex}
      totalSteps={totalSteps}
      actions={actions}
    >
      {status.state === 'installed' && <InstalledBody version={status.version} />}
      {status.state === 'missing' && <MissingBody />}
      {status.state !== 'installed' && status.state !== 'missing' && <CheckingBody />}
    </TourCard>
  )
}

// ─── Body variants ──────────────────────────────────────────────

function CheckingBody() {
  return (
    <>
      <h3 className="text-base font-semibold text-turbo-text mb-2">You're All Set!</h3>
      <div className="flex items-center gap-2 text-sm text-turbo-text-dim">
        <Spinner className="w-4 h-4 text-turbo-accent" />
        <span>Checking for Claude Code…</span>
      </div>
    </>
  )
}

function InstalledBody({ version }: { version?: string }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <CheckIcon />
        <h3 className="text-base font-semibold text-turbo-text">Claude Code detected</h3>
      </div>
      <p className="text-sm text-turbo-text-dim leading-relaxed">
        {version ? `Version ${version} — you're all set. ` : "You're all set. "}
        Add a project folder, then type what you want to work on in the prompt bar.
        Turbo handles the rest.
      </p>
    </>
  )
}

function MissingBody() {
  const recheckClaude = useTourStore(s => s.recheckClaude)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLAUDE_INSTALL_COMMAND)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — silently fail; user can still see the command
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <WarningIcon />
        <h3 className="text-base font-semibold text-turbo-text">
          Install Claude Code for the full experience
        </h3>
      </div>
      <p className="text-sm text-turbo-text-dim leading-relaxed mb-3">
        Turbo orchestrates Claude Code agents to run tasks in parallel. Without it,
        you can still use Turbo as a multi-pane terminal — but you'll miss the
        orchestration superpowers.
      </p>

      <div className="flex items-center gap-2 bg-turbo-bg border border-turbo-border rounded-lg p-2 mb-3">
        <code className="flex-1 text-xs font-mono text-turbo-text truncate">
          {CLAUDE_INSTALL_COMMAND}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 h-7 px-2 rounded text-[11px] font-medium border border-turbo-border
                     text-turbo-text-dim hover:text-turbo-text hover:bg-turbo-surface-hover
                     transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => window.api.openExternal(CLAUDE_INSTALL_DOCS_URL)}
          className="h-7 px-3 rounded-lg text-[11px] font-medium border border-turbo-border
                     text-turbo-text-dim hover:text-turbo-text hover:bg-turbo-surface-hover
                     transition-colors"
        >
          View install guide
        </button>
        <button
          onClick={() => void recheckClaude()}
          className="text-[11px] text-turbo-accent hover:text-turbo-accent-hover transition-colors"
        >
          Already installed? Check again
        </button>
      </div>
    </>
  )
}

// ─── Inline icons ───────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/** Compact illustration for the "Claude Code missing" branch — terminal with download arrow. */
function InstallIllustration() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="installGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="#12121a" rx="12" />
      <circle cx="200" cy="100" r="90" fill="url(#installGlow)" />

      <rect x="110" y="50" width="180" height="100" rx="8" fill="#0a0a0f" stroke="#3a3a4f" strokeWidth="1" />
      <rect x="110" y="50" width="180" height="18" rx="8" fill="#1a1a25" />
      <rect x="110" y="60" width="180" height="8" fill="#1a1a25" />
      <circle cx="122" cy="59" r="2.5" fill="#ef4444" />
      <circle cx="132" cy="59" r="2.5" fill="#f59e0b" />
      <circle cx="142" cy="59" r="2.5" fill="#22c55e" />

      <text x="120" y="92" fill="#22c55e" fontSize="9" fontFamily="JetBrains Mono, monospace">$</text>
      <text x="132" y="92" fill="#e4e4ef" fontSize="9" fontFamily="JetBrains Mono, monospace">npm install -g</text>
      <text x="120" y="106" fill="#9d9db5" fontSize="9" fontFamily="JetBrains Mono, monospace">  @anthropic-ai/claude-code</text>

      <text x="120" y="128" fill="#22c55e" fontSize="9" fontFamily="JetBrains Mono, monospace">$</text>
      <rect x="132" y="120" width="6" height="10" fill="#e4e4ef">
        <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
      </rect>

      <circle cx="280" cy="40" r="14" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M280 33 L280 45 M275 40 L280 45 L285 40" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <text x="200" y="175" textAnchor="middle" fill="#727288" fontSize="11" fontFamily="Inter, system-ui">
        One command to unlock orchestration
      </text>
    </svg>
  )
}
