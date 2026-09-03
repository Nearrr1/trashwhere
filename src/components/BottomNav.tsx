'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Camera, Clock, BookOpen } from 'lucide-react'

interface NavTab {
  id: string
  href: string
  label: string
  Icon: React.ComponentType<{ size: number; strokeWidth: number; 'aria-hidden': 'true' }>
}

const TABS: NavTab[] = [
  { id: 'nav-scan',    href: '/',       label: 'Quét',     Icon: Camera },
  { id: 'nav-history', href: '/history', label: 'Lịch sử', Icon: Clock },
  { id: 'nav-learn',   href: '/learn',   label: 'Tìm hiểu', Icon: BookOpen },
]

/**
 * BottomNav — fixed three-tab bottom navigation bar.
 *
 * Spec (screen-spec §AppShell / BottomNav):
 *  - Position: fixed bottom-0, z-index 20
 *  - Height: 64px + env(safe-area-inset-bottom)
 *  - Background: paper-card · shadow-raised
 *  - Active indicator: 6px dot in forest colour, bottom of the tab cell
 *  - Active label / icon: forest · Inactive: ink-muted
 *
 * The inner div is constrained to max-w-[480px] so the tab strip aligns
 * with the app column at wide viewports.
 */
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-20 bg-paper-card shadow-raised"
      style={{
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid var(--color-paper-rule)',
      }}
    >
      {/* Inner container aligned to the 480px app column */}
      <div className="max-w-[480px] mx-auto h-full flex">
        {TABS.map(({ id, href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href))

          const tabColour = isActive
            ? 'var(--color-forest)'
            : 'var(--color-ink-muted)'

          const sharedStyle: React.CSSProperties = {
            color: tabColour,
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 500,
          }

          return (
            <Link
              key={id}
              id={id}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              style={sharedStyle}
            >
              <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
              {/* Active dot */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 rounded-full bg-forest"
                  style={{ width: '6px', height: '6px' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
