/**
 * Confidence interpretation — single source of truth.
 *
 * All confidence thresholds and their Vietnamese labels live here.
 * Do NOT hardcode threshold values or level labels anywhere else.
 *
 * Architecture (Phase 11 §5):
 *  HIGH   ≥ 0.85   "Rất tự tin"
 *  MEDIUM ≥ 0.60   "Khá tự tin"
 *  LOW     < 0.60  "Chưa chắc chắn"
 *
 * The LOW threshold (0.60) matches the v1/v2.0 behavior and was kept
 * intentionally — see phase-11-v2.1-decision-intelligence-report.md §5.
 */

// ── Thresholds ────────────────────────────────────────────────────────────────

/** Minimum confidence score for the HIGH level. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.85

/**
 * Minimum confidence score for the MEDIUM level.
 * Scores below this are classified as LOW.
 * This is also the existing TrashWhere low-confidence UI trigger.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.60

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Three-level interpretation of a raw confidence score.
 *
 * HIGH   → The classifier is very confident. Show result without caveats.
 * MEDIUM → The classifier is reasonably confident. Show result normally.
 * LOW    → The classifier is uncertain. Show ConfidenceWarning + retake CTA.
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Converts a raw 0–1 confidence score into a discrete ConfidenceLevel.
 *
 * Input is clamped to [0, 1] so that malformed values do not crash the UI
 * (authoritative validation happens server-side before this is called).
 *
 * @param confidence - Raw confidence score, expected to be 0–1
 * @returns ConfidenceLevel
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  const clamped = Math.max(0, Math.min(1, confidence))
  if (clamped >= HIGH_CONFIDENCE_THRESHOLD) return 'HIGH'
  if (clamped >= LOW_CONFIDENCE_THRESHOLD) return 'MEDIUM'
  return 'LOW'
}

/**
 * Returns the localized Vietnamese label for a given confidence level.
 *
 * These strings are displayed in the ConfidenceStamp component.
 * They are intentionally brief for the small stamp format.
 *
 * @param level - Discrete confidence level
 * @returns Vietnamese label string
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return 'Rất tự tin'
    case 'MEDIUM':
      return 'Khá tự tin'
    case 'LOW':
      return 'Chưa chắc chắn'
  }
}

/**
 * Returns true when the confidence score falls below the LOW threshold,
 * triggering the ConfidenceWarning UI and retake-first CTA.
 *
 * Equivalent to: getConfidenceLevel(confidence) === 'LOW'
 * Provided as a named helper to make call-sites self-documenting.
 *
 * @param confidence - Raw confidence score, expected to be 0–1
 */
export function isLowConfidence(confidence: number): boolean {
  return getConfidenceLevel(confidence) === 'LOW'
}
