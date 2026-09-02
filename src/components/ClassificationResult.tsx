'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ClassificationResult as ClassificationResultType } from '@/types/classification'
import { getCategoryMeta, getCategoryZoneStyle } from '@/lib/waste-categories'
import { isLowConfidence } from '@/lib/confidence'
import BotanicalCard from './BotanicalCard'
import CategoryIcon from './CategoryIcon'
import ConfidenceStamp from './ConfidenceStamp'
import ConfidenceWarning from './ConfidenceWarning'
import SectionLabel from './SectionLabel'
import DisposalCard from './DisposalCard'
import DisposalChecklist from './DisposalChecklist'
import ClassificationFeedback from './ClassificationFeedback'
import EducationalDrawer from './EducationalDrawer'


interface ClassificationResultProps {
  result: ClassificationResultType
  /** blob: URL of the user's uploaded image */
  imageUrl: string
  /** Called when user taps "Quét lại" or "Chụp lại" */
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
 *  3. "Đọc thêm về loại rác này" edu trigger → opens EducationalDrawer
 *  4. "Quét lại" action button
 *
 * Low-confidence variant (screen-spec §Screen 5):
 *  - ConfidenceWarning banner appears above the card
 *  - Category name rendered at 70% opacity
 *  - ConfidenceStamp uses dashed border
 *  - Two-button CTA: "Chụp lại" (primary) + "Xem kết quả này" (secondary)
 *  - "Xem kết quả này" dismisses the warning while keeping the result
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

  const isLowConf = isLowConfidence(confidence)
  // Warning is shown initially for low-confidence, dismissed by "Xem kết quả này"
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [isEduDrawerOpen, setIsEduDrawerOpen] = useState(false)
  const [savedScanId, setSavedScanId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle')

  // Asynchronously attempt to persist scan to cloud history if authenticated (non-blocking)
  useEffect(() => {
    let isMounted = true

    async function autoSaveScan() {
      try {
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: result.category,
            confidence: result.confidence,
            explanation: result.explanation,
            disposalAction: result.disposalAction,
            recommendation: result.recommendation,
          }),
        })

        if (!isMounted) return

        if (res.ok) {
          const data = await res.json()
          if (data?.scan?._id) {
            setSavedScanId(data.scan._id)
            setSaveStatus('saved')
          }
        } else if (res.status === 401) {
          // Anonymous user — expected and normal
          setSaveStatus('idle')
        } else {
          setSaveStatus('failed')
        }
      } catch {
        if (isMounted) setSaveStatus('failed')
      }
    }

    autoSaveScan()
    return () => {
      isMounted = false
    }
  }, [result])

  const showWarning = isLowConf && !warningDismissed

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

      {/* ── Low-confidence warning banner ────────────────── */}
      {showWarning && <ConfidenceWarning confidence={confidence} />}

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
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <CategoryIcon category={category} size={32} className="shrink-0" />
            <h1
              className="text-ink break-words min-w-0"
              style={{
                fontFamily: 'var(--font-serif-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                lineHeight: 'var(--leading-tight)',
                // Low-confidence: category name at 70% opacity (screen-spec §Screen 5)
                opacity: showWarning ? 0.7 : 1,
              }}
            >
              {meta.label}
            </h1>
          </div>

          <ConfidenceStamp
            confidence={confidence}
            lowConfidence={showWarning}
          />
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

          {/* Disposal section with interactive checklist */}
          <DisposalCard disposalAction={disposalAction} />
          <DisposalChecklist
            instructions={result.recommendation?.instructions}
            disposalAction={disposalAction}
          />

          {/* Classification Feedback */}
          <ClassificationFeedback scanId={savedScanId || undefined} />

          {/* Cloud save indicator */}
          {saveStatus === 'saved' && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-forest" aria-hidden="true" />
              <span>Đã lưu vào lịch sử quét đám mây</span>
            </div>
          )}
        </div>
      </BotanicalCard>

      {/* ── Actions ─────────────────────────────────────── */}
      {showWarning ? (
        /* Low-confidence: two-button CTA row (screen-spec §Screen 5) */
        <div
          className="flex gap-2 mt-4"
          style={{ marginBottom: '32px' }}
        >
          {/* Primary: retake photo */}
          <button
            id="btn-retake"
            type="button"
            onClick={onRescan}
            className="flex-1 flex items-center justify-center bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
            style={{
              height: '48px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Chụp lại
          </button>

          {/* Secondary: view this result anyway */}
          <button
            id="btn-view-result"
            type="button"
            onClick={() => setWarningDismissed(true)}
            className="flex-1 flex items-center justify-center rounded-md transition-colors"
            style={{
              height: '48px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--color-forest)',
              border: '1px solid var(--color-forest)',
              background: 'transparent',
              cursor: 'pointer',
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Xem kết quả này
          </button>
        </div>
      ) : (
        /* Happy path / warning dismissed: normal actions */
        <>
          {/* Edu trigger */}
          <button
            id="btn-edu-open"
            type="button"
            onClick={() => setIsEduDrawerOpen(true)}
            className="mt-4 flex items-center justify-center gap-1.5"
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
            <span>Đọc thêm về loại rác này</span>
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>

          {/* Rescan button */}
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
        </>
      )}

      {/* ── Educational Drawer ───────────────────────────── */}
      <EducationalDrawer
        category={category}
        isOpen={isEduDrawerOpen}
        onClose={() => setIsEduDrawerOpen(false)}
      />
    </div>
  )
}
