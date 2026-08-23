'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Camera, Clock, BookOpen } from 'lucide-react'

interface NavTab {
  id: string
  href: string
  label: string
  Icon: React.ComponentType<{ size: number; strokeWidth: number; 'aria-hidden': 'true' }>
  /** Post-MVP: blocks navigation and shows "Sắp ra mắt" toast instead */
  postMvp?: boolean
}

const TABS: NavTab[] = [
  { id: 'nav-scan',    href: '/',       label: 'Quét',     Icon: Camera },
  { id: 'nav-history', href: '/history', label: 'Lịch sử', Icon: Clock,    postMvp: true },
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
 *  - "Lịch sử" (post-MVP): shows "Sắp ra mắt" toast on tap
 *
 * The inner div is constrained to max-w-[480px] so the tab strip aligns
 * with the app column at wide viewports.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const [toastVisible, setToastVisible] = useState(false)

  function showPostMvpToast() {
    if (toastVisible) return
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  return (
    <>
      {/* ── Post-MVP toast ──────────────────────────────────── */}
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 bg-ink text-paper rounded-md px-4 py-2 shadow-raised whitespace-nowrap"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Lịch sử: Sắp ra mắt
        </div>
      )}

      {/* ── Navigation bar ─────────────────────────────────── */}
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
          {TABS.map(({ id, href, label, Icon, postMvp }) => {
            const isActive =
              !postMvp &&
              (pathname === href ||
                (href !== '/' && pathname.startsWith(href)))

            const tabColour = isActive
              ? 'var(--color-forest)'
              : 'var(--color-ink-muted)'

            const sharedStyle: React.CSSProperties = {
              color: tabColour,
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 500,
            }

            const innerContent = (
              <>
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
              </>
            )

            /* Post-MVP tabs render as buttons to block navigation */
            if (postMvp) {
              return (
                <button
                  key={id}
                  id={id}
                  type="button"
                  onClick={showPostMvpToast}
                  aria-label={`${label} — Sắp ra mắt`}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
                  style={sharedStyle}
                >
                  {innerContent}
                </button>
              )
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
                {innerContent}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
