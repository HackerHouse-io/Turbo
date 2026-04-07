interface SpinnerProps {
  /** Tailwind classes — control size and color via `text-*` and `w-*`/`h-*`. */
  className?: string
}

/** Animated arc spinner. Color comes from `currentColor`, so set it
 *  with a `text-*` class. Size with `w-*`/`h-*`. */
export function Spinner({ className = 'w-4 h-4' }: SpinnerProps) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
