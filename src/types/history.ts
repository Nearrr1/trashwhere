/**
 * Domain types for Phase 13 (v2.3) Product Intelligence:
 * Cloud Scan History, Classification Feedback, and User Statistics.
 */

import type { WasteCategory } from '@/types/classification'

// ── Classification Feedback ───────────────────────────────────────────────

export interface ClassificationFeedback {
  /** True if the user confirmed the AI result was correct; false otherwise */
  wasCorrect: boolean
  /** When incorrect, the category the user suggested */
  correctedCategory?: WasteCategory
  /** Timestamp when the feedback was provided */
  submittedAt?: string | Date
}

// ── Scan Document Structure (MongoDB) ─────────────────────────────────────

export interface ScanDocument {
  /** String representation of MongoDB ObjectId */
  _id?: string
  /** Authenticated user identifier (email or provider id from server session) */
  userId: string
  /** Canonical waste category classified by the model */
  category: WasteCategory
  /** Confidence score between 0 and 1 */
  confidence: number
  /** Grounded Vietnamese explanation */
  explanation: string
  /** Specific disposal recommendation text */
  disposalAction: string
  /** Optional structured recommendation instructions */
  recommendation?: {
    action: string
    instructions?: string[]
    reason?: string
  }
  /** Optional user feedback attached to this scan */
  feedback?: ClassificationFeedback
  /** Creation timestamp */
  createdAt: string | Date
}

// ── History Aggregation & Statistics ──────────────────────────────────────

export interface HistoryStats {
  totalScans: number
  categoryCounts: Record<WasteCategory, number>
  mostCommonCategory?: WasteCategory
}

export interface HistoryApiResponse {
  scans: ScanDocument[]
  total: number
  stats: HistoryStats
}
