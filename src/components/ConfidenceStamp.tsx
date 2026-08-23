interface ConfidenceStampProps {
  /** Confidence value 0–1 */
  confidence: number
}

/**
 * Returns the Vietnamese verbal label for a given confidence score.
 * screen-spec §Verbal confidence labels.
 */
function getVerbalLabel(confidence: number): string {
  if (confidence >= 0.85) return 'Rất tự tin'
  if (confidence >= 0.60) return 'Khá tự tin'
  return 'Chưa chắc chắn'
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
 */
export default function ConfidenceStamp({ confidence }: ConfidenceStampProps) {
  const pct = Math.round(confidence * 100)
  const verbal = getVerbalLabel(confidence)

  return (
    <div
      className="confidence-stamp flex flex-col items-center justify-center shrink-0"
      style={{
        width: '72px',
        height: '72px',
        borderRadius: 'var(--radius-full)',
        border: '2px solid var(--color-amber)',
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
