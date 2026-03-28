interface ProgressBarProps {
  value: number // 0-100
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={`w-full h-1 bg-turbo-surface-active rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-turbo-accent rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
