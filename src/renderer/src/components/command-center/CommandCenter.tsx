import { motion } from 'framer-motion'

/**
 * WelcomeState — shown when no projects are added yet.
 * Extracted here so SplitLayout can reuse it.
 */
export function WelcomeState({ onAddProject }: { onAddProject: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-full flex flex-col items-center justify-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-turbo-surface border border-turbo-border
                      flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-turbo-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-turbo-text mb-2">
        Welcome to Turbo
      </h2>
      <p className="text-sm text-turbo-text-dim mb-6 max-w-sm">
        Add a project to get started.
      </p>
      <button onClick={onAddProject} className="btn-primary flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        Add Project Folder
      </button>
    </motion.div>
  )
}
