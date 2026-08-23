import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'TrashWhere — Tìm hiểu',
  description:
    'Tìm hiểu về các loại rác thải và cách phân loại đúng cách.',
}

/**
 * Learn page — placeholder for MVP.
 *
 * Full taxonomy listing will be implemented in a later phase.
 * This stub prevents the /learn route from returning a 404,
 * which would break the BottomNav link.
 */
export default function LearnPage() {
  return (
    <AppShell>
      <PageHeader />

      <main
        className="flex-1 flex flex-col items-center justify-center px-5 text-center"
        style={{ paddingBottom: '80px' }}
      >
        <p
          className="text-ink-secondary text-pretty"
          style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '15px',
            fontStyle: 'italic',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: '280px',
          }}
        >
          Trang này sẽ hiển thị danh sách các loại rác thải. Sắp ra mắt.
        </p>
      </main>

      <BottomNav />
    </AppShell>
  )
}
