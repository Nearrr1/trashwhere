import type { ClassificationResult as ClassificationResultType } from '@/types/classification'
import { getCategoryMeta, getCategoryZoneStyle } from '@/lib/waste-categories'
import BotanicalCard from './BotanicalCard'
import CategoryIcon from './CategoryIcon'
import ConfidenceStamp from './ConfidenceStamp'
import SectionLabel from './SectionLabel'
import DisposalCard from './DisposalCard'

interface ClassificationResultProps {
  result: ClassificationResultType
  /** blob: URL of the user's uploaded image */
  imageUrl: string
  /** Called when user taps "Quét lại" */
  onRescan: () => void
}

/**
 * ClassificationResult — full result card screen.
 *
 * Assembles (screen-spec §Screen 4):
 *  1. Specimen image strip (80px, object-cover)
 *  2. BotanicalCard containing:
 *     a. Category zone (4px left accent, tint bg) with CategoryIcon + ConfidenceStamp
 *     b. Separator
 *     c. "TẠI SAO" explanation section
 *     d. Separator
 *     e. "CÁCH XỬ LÝ" disposal section
 *  3. "Đọc thêm về loại rác này" edu trigger
 *  4. "Quét lại" action button
 *
 * Entrance: .result-card CSS class (opacity 0→1, translateY 12→0, 400ms ease-out-expo)
 */
export default function ClassificationResult({
  result,
  imageUrl,
  onRescan,
}: ClassificationResultProps) {
  const { category, confidence, explanation, disposalAction } = result
  const meta = getCategoryMeta(category)
  const zoneStyle = getCategoryZoneStyle(category)

  return (
    <div className="result-card flex flex-col" aria-live="polite" aria-atomic="true">
      {/* ── Specimen image strip ────────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Ảnh đã tải lên để phân loại"
        className="w-full object-cover mt-4"
        style={{
          height: '80px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-card)',
        }}
      />

      {/* ── Result card ─────────────────────────────────── */}
      <BotanicalCard className="mt-4">
        {/* Category zone */}
        <div
          className="flex items-center justify-between"
          style={{
            ...zoneStyle,
            padding: '16px 20px',
            borderTopLeftRadius: 'var(--radius-md)',
            borderTopRightRadius: 'var(--radius-md)',
          }}
        >
          <div className="flex items-center gap-3">
            <CategoryIcon category={category} size={32} />
            <h1
              className="text-ink"
              style={{
                fontFamily: 'var(--font-serif-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                lineHeight: 'var(--leading-tight)',
              }}
            >
              {meta.label}
            </h1>
          </div>

          <ConfidenceStamp confidence={confidence} />
        </div>

        {/* Separator */}
        <hr
          className="border-0"
          style={{
            height: '1px',
            backgroundColor: 'var(--color-paper-rule)',
            margin: '0 20px',
          }}
        />

        {/* Explanation section */}
        <div style={{ padding: '20px' }}>
          <section aria-labelledby="why-label">
            <SectionLabel id="why-label">TẠI SAO</SectionLabel>

            <p
              className="mt-2 text-ink text-pretty"
              style={{
                fontFamily: 'var(--font-serif-body)',
                fontSize: 'var(--text-base)',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              {explanation}
            </p>
          </section>

          {/* Separator */}
          <hr
            className="border-0 my-5"
            style={{
              height: '1px',
              backgroundColor: 'var(--color-paper-rule)',
            }}
          />

          {/* Disposal section */}
          <DisposalCard disposalAction={disposalAction} />
        </div>
      </BotanicalCard>

      {/* ── Edu trigger ─────────────────────────────────── */}
      <button
        id="btn-edu-open"
        type="button"
        className="mt-4 flex items-center justify-center gap-1"
        style={{
          fontFamily: 'var(--font-serif-body)',
          fontSize: '14px',
          color: 'var(--color-forest)',
          minHeight: '44px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Đọc thêm về loại rác này
      </button>

      {/* ── Rescan button ───────────────────────────────── */}
      <button
        id="btn-rescan"
        type="button"
        onClick={onRescan}
        className="mt-3 w-full flex items-center justify-center rounded-md transition-colors"
        style={{
          height: '56px',
          fontFamily: 'var(--font-sans)',
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--color-forest)',
          border: '1px solid var(--color-forest)',
          background: 'transparent',
          cursor: 'pointer',
          transitionDuration: 'var(--duration-fast)',
          marginBottom: '32px',
        }}
      >
        Quét lại
      </button>
    </div>
  )
}
