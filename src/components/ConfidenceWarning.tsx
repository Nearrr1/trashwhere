import { HelpCircle } from 'lucide-react'

/**
 * ConfidenceWarning — uncertainty banner shown when confidence < 0.6.
 *
 * This is NOT an error. It communicates that the result is uncertain
 * while still showing the classification.
 *
 * Spec (screen-spec §Screen 5 — Uncertainty Banner):
 *  - Background: amber-light (#f0e4d0)
 *  - Left border: 4px solid amber
 *  - Radius: radius-md (4px)
 *  - Padding: 12px top/bottom, 16px left/right
 *  - Icon: HelpCircle 20px, amber colour
 *  - Heading: Source Serif 4 500, 14px, amber
 *  - Body: Source Serif 4 400, 13px, ink-secondary
 *  - ARIA: role="status" (informational, not critical)
 */
export default function ConfidenceWarning() {
  return (
    <div
      role="status"
      className="flex gap-3 mt-4"
      style={{
        backgroundColor: 'var(--color-amber-light)',
        borderLeft: '4px solid var(--color-amber)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
      }}
    >
      <HelpCircle
        size={20}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 mt-px"
        style={{ color: 'var(--color-amber)' }}
      />

      <div>
        <p
          style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 'var(--leading-normal)',
            color: 'var(--color-amber)',
          }}
        >
          Kết quả chưa chắc chắn
        </p>
        <p
          className="text-ink-secondary mt-1"
          style={{
            fontFamily: 'var(--font-serif-body)',
            fontSize: '13px',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Độ chính xác thấp — thử chụp lại với ánh sáng tốt hơn hoặc góc nhìn
          khác.
        </p>
      </div>
    </div>
  )
}
