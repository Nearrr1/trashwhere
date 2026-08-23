import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import CategoryIcon from '@/components/CategoryIcon'
import { WASTE_CATEGORIES, getCategoryZoneStyle } from '@/lib/waste-categories'

export const metadata: Metadata = {
  title: 'TrashWhere — Tìm hiểu',
  description:
    'Tìm hiểu về các loại rác thải và cách phân loại đúng cách.',
}

/**
 * Screen 8 — "Tìm hiểu" Static Page (MVP scope).
 *
 * Spec (screen-spec §Screen 8):
 *  - Heading: "Các loại rác thải" · Playfair Display 700 · 28px · mt: 24px · ink · px: 20px
 *  - Category List: all 6 categories rendered with tint bg, 4px accent left border,
 *    32px CategoryIcon, Playfair title (18px), and Source Serif 4 examples (13px).
 *  - Fully static Server Component with zero client JavaScript.
 */
export default function LearnPage() {
  return (
    <AppShell>
      <PageHeader />

      <main
        className="flex-1 flex flex-col px-5"
        style={{ paddingBottom: '80px' }}
      >
        <h1
          className="text-ink mt-6 mb-4"
          style={{
            fontFamily: 'var(--font-serif-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Các loại rác thải
        </h1>

        <section aria-label="Danh sách phân loại rác" className="flex flex-col gap-2 pb-8">
          {WASTE_CATEGORIES.map(cat => {
            const zoneStyle = getCategoryZoneStyle(cat.id)
            return (
              <div
                key={cat.id}
                className="flex items-start gap-3.5 rounded-md"
                style={{
                  ...zoneStyle,
                  padding: '16px 20px',
                }}
              >
                <CategoryIcon category={cat.id} size={32} className="shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <h2
                    className="text-ink"
                    style={{
                      fontFamily: 'var(--font-serif-display)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      lineHeight: 'var(--leading-snug)',
                    }}
                  >
                    {cat.label}
                  </h2>
                  <p
                    className="text-ink-secondary mt-1"
                    style={{
                      fontFamily: 'var(--font-serif-body)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 'var(--leading-normal)',
                    }}
                  >
                    {cat.examples}
                  </p>
                </div>
              </div>
            )
          })}
        </section>
      </main>

      <BottomNav />
    </AppShell>
  )
}
