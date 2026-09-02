import { getConfidenceLabel, getConfidenceLevel } from '@/lib/confidence'

interface ConfidenceStampProps {
  /** Confidence value 0–1 */
  confidence: number
  /** When true, border becomes dashed and text uses amber — for low-confidence results */
  lowConfidence?: boolean
}

/**
 * ConfidenceStamp — circular badge showing confidence % + verbal label.
 *
 * Spec (screen-spec §Confidence Stamp):
 *  - 72×72 circle, 2px solid amber border, transparent bg
 *  - Percentage: Playfair Display 700 italic 22px, amber
 *  - Verbal: Source Serif 4 400 10px, amber, uppercase, letter-spacing
 *  - Entrance: scale(0.7) opacity(0) → scale(1) opacity(1), 300ms ease-spring
 *    Applied via .confidence-stamp CSS class (globals.css)
 *
 * Low-confidence variant (screen-spec §Screen 5):
 *  - Border: dashed 2px amber (--dash pattern: 4px 4px)
 *  - Text colour: amber
 *  - Label below %: "Chưa chắc chắn"
 *
 * Confidence thresholds are defined in src/lib/confidence.ts (Phase 11).
 */
export default function ConfidenceStamp({
  confidence,
  lowConfidence = false,
}: ConfidenceStampProps) {
  const pct = Math.round(confidence * 100)
  const level = getConfidenceLevel(confidence)
  const verbal = getConfidenceLabel(level)

  return (
    <div
      className="confidence-stamp flex flex-col items-center justify-center shrink-0"
      style={{
        width: '72px',
        height: '72px',
        borderRadius: 'var(--radius-full)',
        border: `2px ${lowConfidence ? 'dashed' : 'solid'} var(--color-amber)`,
        background: 'transparent',
      }}
      aria-label={`Độ tự tin: ${pct}% — ${verbal}`}
    >
      {/* Percentage — stamp typography */}
      <span
        style={{
          fontFamily: 'var(--font-serif-display)',
          fontSize: '22px',
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1.2,
          color: 'var(--color-amber)',
        }}
      >
        {pct}%
      </span>

      {/* Verbal label */}
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--font-serif-body)',
          fontSize: '10px',
          fontWeight: 400,
          lineHeight: 1.5,
          letterSpacing: 'var(--tracking-wider)',
          color: 'var(--color-amber)',
        }}
      >
        {verbal}
      </span>
    </div>
  )
}
