/**
 * Confidence interpretation tests — Phase 11
 *
 * Covers all exported functions from src/lib/confidence.ts:
 *  - getConfidenceLevel: boundary values, clamping, all three branches
 *  - getConfidenceLabel: all three levels
 *  - isLowConfidence: boundary values, guard against NaN/Infinity
 *
 * Thresholds under test:
 *  HIGH   ≥ 0.85
 *  MEDIUM ≥ 0.60
 *  LOW     < 0.60
 */

import { describe, it, expect } from 'vitest'
import {
  getConfidenceLevel,
  getConfidenceLabel,
  isLowConfidence,
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
} from '../confidence'

// ── Threshold constants ────────────────────────────────────────────────────

describe('confidence threshold constants', () => {
  it('HIGH_CONFIDENCE_THRESHOLD is 0.85', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(0.85)
  })

  it('LOW_CONFIDENCE_THRESHOLD is 0.60', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.60)
  })

  it('HIGH threshold is strictly greater than LOW threshold', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(LOW_CONFIDENCE_THRESHOLD)
  })
})

// ── getConfidenceLevel ─────────────────────────────────────────────────────

describe('getConfidenceLevel', () => {
  // ── HIGH boundary ──
  it('returns HIGH at exactly 1.0', () => {
    expect(getConfidenceLevel(1.0)).toBe('HIGH')
  })

  it('returns HIGH at exactly 0.85 (HIGH_CONFIDENCE_THRESHOLD)', () => {
    expect(getConfidenceLevel(0.85)).toBe('HIGH')
  })

  it('returns HIGH at 0.90', () => {
    expect(getConfidenceLevel(0.90)).toBe('HIGH')
  })

  it('returns HIGH at 0.99', () => {
    expect(getConfidenceLevel(0.99)).toBe('HIGH')
  })

  // ── MEDIUM boundary ──
  it('returns MEDIUM just below HIGH threshold (0.849)', () => {
    expect(getConfidenceLevel(0.849)).toBe('MEDIUM')
  })

  it('returns MEDIUM at exactly 0.60 (LOW_CONFIDENCE_THRESHOLD)', () => {
    expect(getConfidenceLevel(0.60)).toBe('MEDIUM')
  })

  it('returns MEDIUM at 0.72', () => {
    expect(getConfidenceLevel(0.72)).toBe('MEDIUM')
  })

  it('returns MEDIUM at 0.75', () => {
    expect(getConfidenceLevel(0.75)).toBe('MEDIUM')
  })

  // ── LOW boundary ──
  it('returns LOW just below MEDIUM threshold (0.599)', () => {
    expect(getConfidenceLevel(0.599)).toBe('LOW')
  })

  it('returns LOW at 0.50', () => {
    expect(getConfidenceLevel(0.50)).toBe('LOW')
  })

  it('returns LOW at 0.0', () => {
    expect(getConfidenceLevel(0.0)).toBe('LOW')
  })

  it('returns LOW at 0.1', () => {
    expect(getConfidenceLevel(0.1)).toBe('LOW')
  })

  // ── Clamping ──
  it('clamps values above 1.0 to HIGH (e.g., 1.5)', () => {
    expect(getConfidenceLevel(1.5)).toBe('HIGH')
  })

  it('clamps values below 0 to LOW (e.g., -0.2)', () => {
    expect(getConfidenceLevel(-0.2)).toBe('LOW')
  })

  it('clamps negative infinity to LOW', () => {
    expect(getConfidenceLevel(-Infinity)).toBe('LOW')
  })

  it('clamps positive infinity to HIGH', () => {
    expect(getConfidenceLevel(Infinity)).toBe('HIGH')
  })

  it('treats NaN as LOW after clamping (NaN behaviour via Math.max/min)', () => {
    // Math.max(0, Math.min(1, NaN)) === NaN; NaN >= 0.85 is false, NaN >= 0.60 is false → LOW
    expect(getConfidenceLevel(NaN)).toBe('LOW')
  })
})

// ── getConfidenceLabel ─────────────────────────────────────────────────────

describe('getConfidenceLabel', () => {
  it('returns Vietnamese label for HIGH', () => {
    expect(getConfidenceLabel('HIGH')).toBe('Rất tự tin')
  })

  it('returns Vietnamese label for MEDIUM', () => {
    expect(getConfidenceLabel('MEDIUM')).toBe('Khá tự tin')
  })

  it('returns Vietnamese label for LOW', () => {
    expect(getConfidenceLabel('LOW')).toBe('Chưa chắc chắn')
  })

  it('returns a non-empty string for all three levels', () => {
    for (const level of ['HIGH', 'MEDIUM', 'LOW'] as const) {
      const label = getConfidenceLabel(level)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('labels contain no English text (must be fully Vietnamese)', () => {
    for (const level of ['HIGH', 'MEDIUM', 'LOW'] as const) {
      const label = getConfidenceLabel(level)
      // Ensure no raw English confidence-level words leak through
      expect(label.toLowerCase()).not.toContain('high')
      expect(label.toLowerCase()).not.toContain('medium')
      expect(label.toLowerCase()).not.toContain('low')
    }
  })

  it('is consistent with getConfidenceLevel at boundary values', () => {
    // At 0.90 → HIGH → 'Rất tự tin'
    expect(getConfidenceLabel(getConfidenceLevel(0.90))).toBe('Rất tự tin')
    // At 0.72 → MEDIUM → 'Khá tự tin'
    expect(getConfidenceLabel(getConfidenceLevel(0.72))).toBe('Khá tự tin')
    // At 0.45 → LOW → 'Chưa chắc chắn'
    expect(getConfidenceLabel(getConfidenceLevel(0.45))).toBe('Chưa chắc chắn')
  })
})

// ── isLowConfidence ────────────────────────────────────────────────────────

describe('isLowConfidence', () => {
  it('returns false for HIGH confidence (0.90)', () => {
    expect(isLowConfidence(0.90)).toBe(false)
  })

  it('returns false for HIGH confidence at the threshold (0.85)', () => {
    expect(isLowConfidence(0.85)).toBe(false)
  })

  it('returns false for MEDIUM confidence (0.72)', () => {
    expect(isLowConfidence(0.72)).toBe(false)
  })

  it('returns false at exactly the LOW threshold (0.60)', () => {
    expect(isLowConfidence(0.60)).toBe(false) // 0.60 is MEDIUM, not LOW
  })

  it('returns true just below the LOW threshold (0.599)', () => {
    expect(isLowConfidence(0.599)).toBe(true)
  })

  it('returns true at 0.50', () => {
    expect(isLowConfidence(0.50)).toBe(true)
  })

  it('returns true at 0.0', () => {
    expect(isLowConfidence(0.0)).toBe(true)
  })

  it('returns false for over-range values clamped to HIGH (1.5)', () => {
    expect(isLowConfidence(1.5)).toBe(false)
  })

  it('returns true for negative values clamped to LOW (-0.1)', () => {
    expect(isLowConfidence(-0.1)).toBe(true)
  })

  it('is consistent with getConfidenceLevel === LOW', () => {
    const testValues = [0.0, 0.3, 0.59, 0.60, 0.72, 0.85, 0.95, 1.0]
    for (const v of testValues) {
      expect(isLowConfidence(v)).toBe(getConfidenceLevel(v) === 'LOW')
    }
  })
})
