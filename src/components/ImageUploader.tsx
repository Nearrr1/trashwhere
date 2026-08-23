'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'
import ViewfinderFrame from './ViewfinderFrame'
import ClassificationResultCard from './ClassificationResult'
import { getMockClassification } from '@/lib/mock-classifier'
import type {
  AppState,
  ClassificationResult,
} from '@/types/classification'

// ── Types ──────────────────────────────────────────────────────────────

interface ValidationError {
  message: string
}

// ── Constants ───────────────────────────────────────────────────────────

const ACCEPTED_MIME: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Client-side validation (UX-only).
 * Server-side validation (authoritative) will run in the route handler.
 */
function validateFile(file: File): ValidationError | null {
  if (!ACCEPTED_MIME.has(file.type)) {
    return {
      message:
        'Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
    }
  }
  if (file.size > MAX_BYTES) {
    return {
      message: 'Tệp quá lớn. Vui lòng chọn ảnh dưới 10 MB.',
    }
  }
  return null
}

// ── Component ───────────────────────────────────────────────────────────

/**
 * ImageUploader — the core interactive component for the scan flow.
 *
 * State machine (ux-flows.md §Flow 5):
 *   SCAN      → PREVIEW   : user selects / captures a file (valid)
 *   PREVIEW   → SCAN      : user taps "Chọn lại"
 *   PREVIEW   → ANALYZING : user taps "Phân tích"
 *   ANALYZING → RESULT    : mock classifier resolves
 *   ANALYZING → ERROR     : mock classifier rejects / abort
 *   RESULT    → SCAN      : user taps "Quét lại"
 *   ERROR     → SCAN      : user taps "Thử lại"
 *
 * File input pattern (ux-flows.md §Interaction Details):
 *   Two hidden <input type="file"> elements:
 *     1. Camera:  accept="image/*" capture="environment"
 *     2. Gallery: accept="image/*" (no capture)
 *   Visible buttons call .click() on the hidden inputs.
 *
 * Image preview uses URL.createObjectURL — revoked on cleanup / reselect
 * to avoid memory leaks.
 *
 * AbortController architecture is in place for the future real API.
 */
export default function ImageUploader() {
  const [appState, setAppState] = useState<AppState>('SCAN')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [classificationResult, setClassificationResult] =
    useState<ClassificationResult | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Object URL lifecycle ───────────────────────────────────────────

  const revokeUrl = useCallback(() => {
    setImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  // Revoke on unmount + abort any in-flight analysis
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      setImageUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  // ── File handling ──────────────────────────────────────────────────

  function handleFileSelected(file: File) {
    const err = validateFile(file)
    if (err) {
      setValidationError(err.message)
      return
    }
    setValidationError(null)
    revokeUrl()
    setImageUrl(URL.createObjectURL(file))
    setClassificationResult(null)
    setAppState('PREVIEW')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileSelected(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  // ── State transitions ─────────────────────────────────────────────

  function handleReselect() {
    abortControllerRef.current?.abort()
    revokeUrl()
    setValidationError(null)
    setClassificationResult(null)
    setAppState('SCAN')
  }

  async function handleAnalyze() {
    // Immediately enter ANALYZING — do not wait
    setAppState('ANALYZING')

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await getMockClassification(controller.signal)
      // Guard: if aborted between resolution and setState, do nothing
      if (controller.signal.aborted) return
      setClassificationResult(result)
      setAppState('RESULT')
    } catch (error: unknown) {
      // AbortError means the user cancelled — don't show error state
      if (error instanceof DOMException && error.name === 'AbortError') return
      setAppState('ERROR')
    }
  }

  function handleRescan() {
    abortControllerRef.current?.abort()
    revokeUrl()
    setValidationError(null)
    setClassificationResult(null)
    setAppState('SCAN')
  }

  function handleRetry() {
    abortControllerRef.current?.abort()
    revokeUrl()
    setValidationError(null)
    setClassificationResult(null)
    setAppState('SCAN')
  }

  // ── Derived state ─────────────────────────────────────────────────

  const viewfinderState =
    appState === 'ANALYZING'
      ? 'loading'
      : appState === 'PREVIEW'
        ? 'preview'
        : 'idle'

  // ── Render ────────────────────────────────────────────────────────

  return (
    <section aria-label="Phân loại rác thải" className="flex flex-col">
      {/* ── Viewfinder (SCAN / PREVIEW / ANALYZING) ─────── */}
      {(appState === 'SCAN' ||
        appState === 'PREVIEW' ||
        appState === 'ANALYZING') && (
        <>
          <ViewfinderFrame
            state={viewfinderState}
            imageUrl={imageUrl ?? undefined}
          />

          {/* ── Tagline (SCAN state only) ────────────────── */}
          {appState === 'SCAN' && (
            <p
              className="text-center text-ink-secondary mt-4 text-pretty"
              style={{
                fontFamily: 'var(--font-serif-body)',
                fontSize: '14px',
                fontStyle: 'italic',
                lineHeight: 'var(--leading-snug)',
              }}
            >
              Mỗi vật đều có câu chuyện của nó.
            </p>
          )}

          {/* ── ANALYZING status text ────────────────────── */}
          {appState === 'ANALYZING' && (
            <p
              aria-live="polite"
              className="text-center text-ink-secondary mt-4"
              style={{
                fontFamily: 'var(--font-serif-body)',
                fontSize: '15px',
                fontStyle: 'italic',
                lineHeight: 'var(--leading-snug)',
              }}
            >
              Đang phân tích...
            </p>
          )}
        </>
      )}

      {/* ── Validation error (inline, below viewfinder) ─── */}
      {validationError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-sm"
          style={{
            backgroundColor: 'var(--color-cat-hazardous-tint)',
            borderLeft: '4px solid var(--color-terra)',
            padding: '10px 14px',
          }}
        >
          <AlertTriangle
            size={20}
            strokeWidth={2}
            aria-hidden="true"
            className="shrink-0 mt-px"
            style={{ color: 'var(--color-terra)' }}
          />
          <p
            className="text-ink"
            style={{
              fontFamily: 'var(--font-serif-body)',
              fontSize: '13px',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            {validationError}
          </p>
        </div>
      )}

      {/* ── SCAN actions ──────────────────────────────────── */}
      {appState === 'SCAN' && (
        <div className="mt-5 flex flex-col">
          <button
            id="btn-capture"
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
            style={{
              height: '56px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            <Camera size={18} strokeWidth={1.5} aria-hidden="true" />
            Chụp ảnh
          </button>

          <button
            id="btn-upload"
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mt-3 underline"
            style={{
              fontFamily: 'var(--font-serif-body)',
              fontSize: '13px',
              color: 'var(--color-forest)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            hoặc tải lên từ thư viện
          </button>
        </div>
      )}

      {/* ── PREVIEW actions ────────────────────────────────── */}
      {appState === 'PREVIEW' && (
        <div className="mt-5 flex flex-col">
          <button
            id="btn-analyze"
            type="button"
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
            style={{
              height: '56px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Phân tích
          </button>

          <button
            id="btn-reselect"
            type="button"
            onClick={handleReselect}
            className="mt-3"
            style={{
              fontFamily: 'var(--font-serif-body)',
              fontSize: '14px',
              color: 'var(--color-forest)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Chọn lại
          </button>
        </div>
      )}

      {/* ── ANALYZING actions (disabled button) ────────────── */}
      {appState === 'ANALYZING' && (
        <div className="mt-5 flex flex-col">
          <button
            id="btn-analyze"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 bg-forest text-paper rounded-md"
            style={{
              height: '56px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              opacity: 0.6,
              cursor: 'not-allowed',
            }}
          >
            Phân tích
          </button>
        </div>
      )}

      {/* ── RESULT screen ──────────────────────────────────── */}
      {appState === 'RESULT' && classificationResult && imageUrl && (
        <ClassificationResultCard
          result={classificationResult}
          imageUrl={imageUrl}
          onRescan={handleRescan}
        />
      )}

      {/* ── ERROR screen ───────────────────────────────────── */}
      {appState === 'ERROR' && (
        <div
          role="alert"
          className="flex flex-col items-center text-center"
          style={{ padding: '48px 20px' }}
        >
          <AlertTriangle
            size={48}
            strokeWidth={1}
            aria-hidden="true"
            style={{ color: 'var(--color-terra)', marginBottom: '20px' }}
          />
          <h1
            className="text-ink"
            style={{
              fontFamily: 'var(--font-serif-display)',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Không thể phân tích ảnh
          </h1>
          <p
            className="text-ink-secondary text-pretty"
            style={{
              fontFamily: 'var(--font-serif-body)',
              fontSize: '15px',
              maxWidth: '280px',
              marginBottom: '32px',
            }}
          >
            Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.
          </p>
          <button
            id="btn-retry"
            type="button"
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
            style={{
              height: '56px',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Hidden file inputs ─────────────────────────────── */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={handleInputChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={handleInputChange}
      />
    </section>
  )
}
