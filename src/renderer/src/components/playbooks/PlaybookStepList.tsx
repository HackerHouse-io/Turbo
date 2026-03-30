import type { PlaybookStepDefinition } from '../../../../shared/types'

interface PlaybookStepListProps {
  steps: PlaybookStepDefinition[]
  endsWithCommit: boolean
  truncateAt?: number
  onStepClick?: (index: number) => void
  expandedSteps?: Set<number>
}

export function PlaybookStepList({
  steps,
  endsWithCommit,
  truncateAt = 80,
  onStepClick,
  expandedSteps
}: PlaybookStepListProps) {
  return (
    <>
      {steps.map((step, i) => {
        const isExpanded = expandedSteps?.has(i)
        const preview = step.prompt.length > truncateAt
          ? step.prompt.slice(0, truncateAt) + '...'
          : step.prompt

        return (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                           flex items-center justify-center text-[10px] text-turbo-text-muted flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-turbo-text">{step.name}</span>
                {step.permissionMode && step.permissionMode !== 'default' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                    {step.permissionMode}
                  </span>
                )}
                {step.effort && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-turbo-surface border border-turbo-border text-turbo-text-muted">
                    {step.effort}
                  </span>
                )}
              </div>
              {onStepClick ? (
                <button
                  onClick={() => onStepClick(i)}
                  className="text-left mt-1 text-[11px] text-turbo-text-dim leading-relaxed hover:text-turbo-text-muted transition-colors"
                >
                  {isExpanded ? step.prompt : preview}
                </button>
              ) : (
                <p className="text-turbo-text-muted text-[11px] truncate mt-0.5">{preview}</p>
              )}
            </div>
          </div>
        )
      })}
      {endsWithCommit && (
        <div className="flex gap-2.5 mt-1">
          <span className="w-5 h-5 rounded-full bg-turbo-surface border border-turbo-border
                         flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-turbo-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6" />
            </svg>
          </span>
          <span className="text-xs italic text-turbo-text-muted mt-0.5">Commit & push</span>
        </div>
      )}
    </>
  )
}
