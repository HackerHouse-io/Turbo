export const PLAN_GENERATION_PROMPT = `Analyze this project and create a PLAN.md at the project root that serves as an interactive roadmap.

Steps:
1. Read the codebase structure, README, configs, and key source files to understand what this project does and how it's built
2. Check git log to understand what's been built recently and the project's trajectory
3. Write a PLAN.md that:
   - Starts with a # project title and a > blockquote summarizing the project's purpose
   - Groups work into logical ## phase sections (e.g. Foundation, Core Features, Polish, Launch)
   - Uses - [x] checkboxes for work that's clearly already done (based on existing code)
   - Uses - [ ] checkboxes for planned/remaining/future work
   - References actual features, components, files, and architecture specific to THIS project
   - Keeps tasks concrete and actionable — no generic filler like "set up project structure"
   - Includes a realistic mix: things already built should be checked off, future work unchecked

Write the file directly to PLAN.md in the project root.`

interface PlanEmptyStateProps {
  searchedPaths: string[]
  onCreatePlan: () => void
}

export function PlanEmptyState({ searchedPaths, onCreatePlan }: PlanEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      {/* Document icon */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        className="mb-4 opacity-30"
      >
        <rect x="10" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="1.5" className="text-turbo-text-muted" />
        <line x1="16" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="1.5" className="text-turbo-text-muted" />
        <line x1="16" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="1.5" className="text-turbo-text-muted" />
        <line x1="16" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="1.5" className="text-turbo-text-muted" />
      </svg>

      <h3 className="text-lg font-medium text-turbo-text mb-1">No PLAN.md found</h3>
      <p className="text-sm text-turbo-text-dim mb-4 max-w-sm">
        Generate a project roadmap by analyzing your codebase with Claude
      </p>

      {/* Searched paths */}
      <div className="mb-5">
        <p className="text-[10px] text-turbo-text-muted mb-1">Searched locations:</p>
        {searchedPaths.map((p, i) => (
          <p key={i} className="text-[10px] text-turbo-text-muted font-mono">{p}</p>
        ))}
      </div>

      <button
        onClick={onCreatePlan}
        className="px-4 py-2 rounded-lg bg-turbo-accent/20 text-turbo-accent text-sm font-medium hover:bg-turbo-accent/30 transition-colors"
      >
        Generate PLAN.md with Claude
      </button>
    </div>
  )
}
