/**
 * Domain types for the TrashWhere classification system.
 *
 * These types define the contract between the UI, the route handler,
 * and (eventually) the AI provider. All WasteCategory values are
 * defined once in src/lib/waste-categories.ts.
 */

// ── Waste category ──────────────────────────────────────────────────────────

/**
 * Canonical waste category IDs.
 * Single source of truth: src/lib/waste-categories.ts
 */
export type WasteCategory =
  | 'recyclable'
  | 'organic'
  | 'hazardous'
  | 'electronic'
  | 'general'
  | 'unknown'

// ── Classification result ───────────────────────────────────────────────────

/**
 * An alternative candidate classification returned alongside the primary result.
 *
 * Phase 11 note: The field exists for forward-compatibility (v2.2+).
 * The current Gemini structured schema returns exactly one category;
 * alternatives are NOT populated in Phase 11. See decision log in
 * phase-11-v2.1-decision-intelligence-report.md §9.
 */
export interface ClassificationAlternative {
  /** Candidate waste category */
  category: WasteCategory
  /** Confidence score 0–1 for this alternative */
  confidence: number
}

/**
 * Structured disposal recommendation.
 *
 * Phase 11 note: Forward-compatible type for future structured disposal UX.
 * The current pipeline uses disposalAction: string; this interface is defined
 * for v2.2+ usage without a breaking change.
 */
export interface DisposalRecommendation {
  /** Primary action string — maps to the existing disposalAction field */
  action: string
  /** Optional ordered step list for future structured display */
  instructions?: string[]
  /** Optional short rationale linking classification to disposal */
  reason?: string
}

/**
 * The four required fields for every successful classification.
 * architecture.md §3 — Response schema.
 *
 * Phase 11: Added optional `alternatives` field (forward-compat, not yet populated).
 */
export interface ClassificationResult {
  /** Canonical waste category */
  category: WasteCategory
  /** Numeric confidence score, 0–1 */
  confidence: number
  /** Plain-language explanation suitable for a Vietnamese high-school student */
  explanation: string
  /** Specific recommended disposal step */
  disposalAction: string
  /**
   * Alternative candidate classifications, if available.
   * Currently unused (Phase 11 deferral — see §9 of the Phase 11 report).
   * Will be populated when the backend schema is extended in v2.2.
   */
  alternatives?: ClassificationAlternative[]
  /**
   * Optional structured disposal recommendation with actionable steps.
   */
  recommendation?: DisposalRecommendation
}

// ── API error ───────────────────────────────────────────────────────────────

/** Error codes returned by /api/classify (architecture.md §3, §8) */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'MISSING_IMAGE'
  | 'INVALID_REQUEST'
  | 'AI_ERROR'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'TOO_MANY_REQUESTS'
  | 'UNKNOWN'

export interface ApiError {
  error: string
  message: string
  code?: ApiErrorCode
}

// ── App state ───────────────────────────────────────────────────────────────

/**
 * Five states in the scan flow (ux-flows.md §Flow 5).
 * State transitions are managed entirely in ImageUploader.
 */
export type AppState = 'SCAN' | 'PREVIEW' | 'ANALYZING' | 'RESULT' | 'ERROR'
