import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import ImageUploader from '@/components/ImageUploader'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'TrashWhere — Quét rác',
  description:
    'Chụp ảnh hoặc tải lên hình ảnh một vật để phân loại rác thải và nhận hướng dẫn xử lý đúng cách.',
}

/**
 * Home — Scan screen (SCAN / PREVIEW states).
 *
 * Server Component: the interactive scan logic lives inside ImageUploader
 * (Client Component). This page only assembles the layout shell.
 *
 * Layout (screen-spec §Screen 0 + §Screen 1):
 *   AppShell (max-w-480, centred)
 *     PageHeader (52px, forest bg)
 *     main (flex-1, px-5, pt-4, pb-[80px] — bottom padding clears fixed BottomNav)
 *       ImageUploader (SCAN / PREVIEW state machine)
 *     BottomNav (fixed, z-20)
 */
export default function Home() {
  return (
    <AppShell>
      <PageHeader />

      <main
        className="flex-1 flex flex-col px-5 pt-4"
        style={{ paddingBottom: '80px' }}
      >
        {/*
          aria-live region — updated by ImageUploader when analysis
          starts / completes (Phase 4). Rendered here so it is always
          in the DOM and assistive technologies register it early.
        */}
        <div
          aria-live="polite"
          aria-atomic="true"
          aria-label="Trạng thái phân tích"
          className="sr-only"
          id="status-region"
        />

        <ImageUploader />
      </main>

      <BottomNav />
    </AppShell>
  )
}
