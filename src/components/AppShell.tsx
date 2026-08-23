import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

/**
 * AppShell — outermost layout wrapper.
 *
 * Constraints:
 *  - Full-viewport paper background
 *  - Content column: max-w-[480px], centred, full-height flex column
 *  - At lg+ breakpoints a subtle column shadow distinguishes the app
 *    from the surrounding paper field (screen-spec §Responsive)
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper">
      <div
        className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col"
        style={{
          // Only visible at desktop breakpoints — negligible at mobile
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
