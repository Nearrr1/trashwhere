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
 * The four required fields for every successful classification.
 * architecture.md §3 — Response schema.
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
