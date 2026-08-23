'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import type { WasteCategory } from '@/types/classification'
import { getCategoryMeta } from '@/lib/waste-categories'
import CategoryIcon from './CategoryIcon'
import SectionLabel from './SectionLabel'

interface EducationalDrawerProps {
  category: WasteCategory
  isOpen: boolean
  onClose: () => void
}

/**
 * EducationalDrawer — bottom drawer presenting environmental context,
 * key statistic, and expanded disposal guidelines for a waste category.
 *
 * Spec (screen-spec §Screen 7, ux-flows §Flow 4):
 *  - Slide up from bottom: 320ms ease-out-expo
 *  - Max height: ~80vh, scrollable
 *  - Overlay: paper background with 60% opacity (z-index: 30)
 *  - Drawer surface: paper-card, radius-lg on top corners, shadow-overlay (z-index: 40)
 *  - Drag handle: 32×4px, paper-rule, radius-full, centered
 *  - Category Header: CategoryIcon 48px + Playfair Display 700 22px + close button
 *  - Environmental Impact: 2–3 sentences (Source Serif 4 15px)
 *  - Key Fact block: amber-light background, bold highlighted statistic number
 *  - Disposal Detail: expanded disposal instructions
 *
 * Accessibility:
 *  - role="dialog", aria-modal="true", aria-labelledby="drawer-title"
 *  - Escape key dismiss
 *  - Click overlay to dismiss
 *  - Body scroll locking while open
 *  - Focus management
 */
export default function EducationalDrawer({
  category,
  isOpen,
  onClose,
}: EducationalDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const meta = getCategoryMeta(category)
  const { edu } = meta

  // ── Keyboard & Scroll Lock ──────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus close button on open
    closeButtonRef.current?.focus()

    // Add escape key listener
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <>
      {/* ── Semi-transparent paper overlay (z-index: 30) ─── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-30 transition-opacity"
        style={{
          backgroundColor: 'rgba(245, 240, 232, 0.6)',
          backdropFilter: 'none', // No glassmorphism per spec
        }}
      />

      {/* ── Bottom Drawer (z-index: 40) ──────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="drawer fixed bottom-0 left-0 right-0 z-40 overflow-hidden"
        style={{
          maxHeight: '80vh',
        }}
      >
        <div
          className="max-w-[480px] mx-auto bg-paper-card flex flex-col overflow-y-auto"
          style={{
            maxHeight: '80vh',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-overlay)',
            borderTop: '1px solid var(--color-paper-rule)',
            borderLeft: '1px solid var(--color-paper-rule)',
            borderRight: '1px solid var(--color-paper-rule)',
          }}
        >
          {/* ── Drag handle ──────────────────────────────── */}
          <div
            aria-hidden="true"
            className="shrink-0 mx-auto"
            style={{
              width: '32px',
              height: '4px',
              backgroundColor: 'var(--color-paper-rule)',
              borderRadius: 'var(--radius-full)',
              marginTop: '12px',
              marginBottom: '16px',
            }}
          />

          {/* ── Category Header ──────────────────────────── */}
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              paddingLeft: '24px',
              paddingRight: '16px',
              paddingBottom: '16px',
            }}
          >
            <div className="flex items-center gap-3">
              <CategoryIcon category={category} size={48} />
              <h2
                id="drawer-title"
                className="text-ink"
                style={{
                  fontFamily: 'var(--font-serif-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 700,
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                {meta.label}
              </h2>
            </div>

            {/* Close button (44×44px touch target) */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex items-center justify-center text-ink-secondary hover:text-ink transition-colors rounded-sm"
              style={{
                width: '44px',
                height: '44px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={22} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* ── Separator ────────────────────────────────── */}
          <hr
            className="border-0 shrink-0"
            style={{
              height: '1px',
              backgroundColor: 'var(--color-paper-rule)',
              margin: '0 24px',
            }}
          />

          {/* ── Drawer Scrollable Content ────────────────── */}
          <div className="flex flex-col pt-5 pb-6">
            {/* 1. Environmental Impact */}
            <section
              aria-labelledby="env-impact-label"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <SectionLabel id="env-impact-label">
                TÁC ĐỘNG MÔI TRƯỜNG
              </SectionLabel>

              <p
                className="mt-2 text-ink text-pretty"
                style={{
                  fontFamily: 'var(--font-serif-body)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-relaxed)',
                }}
              >
                {edu.environmentalImpact}
              </p>
            </section>

            {/* 2. Key Fact Block */}
            <div
              className="flex flex-col"
              style={{
                backgroundColor: 'var(--color-amber-light)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginLeft: '24px',
                marginRight: '24px',
                marginTop: '16px',
                marginBottom: '16px',
              }}
            >
              <p
                className="text-ink text-pretty"
                style={{
                  fontFamily: 'var(--font-serif-body)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                {edu.keyFact.prefix}
                <span
                  style={{
                    fontFamily: 'var(--font-serif-body)',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  {edu.keyFact.highlight}
                </span>
                {edu.keyFact.suffix}
              </p>
            </div>

            {/* 3. Disposal Detail */}
            <section
              aria-labelledby="disposal-detail-label"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <SectionLabel id="disposal-detail-label">
                XỬ LÝ ĐÚNG CÁCH
              </SectionLabel>

              <p
                className="mt-2 text-ink text-pretty"
                style={{
                  fontFamily: 'var(--font-serif-body)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-relaxed)',
                }}
              >
                {edu.disposalDetail}
              </p>
            </section>

            {/* ── Dismiss CTA Button ───────────────────────── */}
            <div
              style={{
                paddingLeft: '24px',
                paddingRight: '24px',
                marginTop: '24px',
              }}
            >
              <button
                id="btn-edu-close"
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
                style={{
                  height: '48px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '15px',
                  fontWeight: 500,
                  transitionDuration: 'var(--duration-fast)',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
