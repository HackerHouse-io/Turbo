import { SessionSidebar } from '../sidebar/SessionSidebar'
import { TerminalGrid } from '../terminal/TerminalGrid'
import { InlinePrompt } from '../command-center/InlinePrompt'
import { useProjectStore } from '../../stores/useProjectStore'
import { WelcomeState } from '../command-center/CommandCenter'

export function SplitLayout() {
  const projects = useProjectStore(s => s.projects)
  const addProjectFromPath = useProjectStore(s => s.addProjectFromPath)

  // First launch — no projects
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <WelcomeState onAddProject={async () => {
          const folderPath = await window.api.openFolderDialog()
          if (folderPath) await addProjectFromPath(folderPath)
        }} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Session sidebar */}
      <SessionSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Terminal grid */}
        <TerminalGrid />

        <div className="flex-shrink-0 border-t border-turbo-border/30 bg-turbo-bg/95 backdrop-blur-md px-6 py-4">
          <InlinePrompt />
        </div>
      </div>
    </div>
  )
}
