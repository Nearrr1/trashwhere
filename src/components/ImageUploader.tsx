'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'
import ViewfinderFrame from './ViewfinderFrame'

// ── Types ──────────────────────────────────────────────────────────────

/** The five app states defined in ux-flows.md §Flow 5. Only SCAN and PREVIEW are
 *  implemented in this phase. ANALYZING / RESULT / ERROR require /api/classify. */
type AppState = 'SCAN' | 'PREVIEW'

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
 *   SCAN    → PREVIEW : user selects / captures a file (valid)
 *   PREVIEW → SCAN    : user taps "Chọn lại"
 *   PREVIEW → ANALYZING (future): user taps "Phân tích"
 *
 * File input pattern (ux-flows.md §Interaction Details):
 *   Two hidden <input type="file"> elements:
 *     1. Camera:  accept="image/*" capture="environment"
 *     2. Gallery: accept="image/*" (no capture)
 *   Visible buttons call .click() on the hidden inputs.
 *
 * Image preview uses URL.createObjectURL — revoked on cleanup / reselect
 * to avoid memory leaks.
 */
export default function ImageUploader() {
  const [appState, setAppState] = useState<AppState>('SCAN')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Revoke the current object URL if one exists
  const revokeUrl = useCallback(() => {
    setImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  // Revoke on unmount
  useEffect(() => {
    return () => {
      setImageUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  function handleFileSelected(file: File) {
    const err = validateFile(file)
    if (err) {
      setValidationError(err.message)
      // Do not transition; leave viewfinder in idle state
      return
    }
    setValidationError(null)
    revokeUrl()
    setImageUrl(URL.createObjectURL(file))
    setAppState('PREVIEW')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileSelected(file)
    // Reset so the same file can be re-selected if the user wants
    e.target.value = ''
  }

  function handleReselect() {
    revokeUrl()
    setValidationError(null)
    setAppState('SCAN')
  }

  /**
   * "Phân tích" — will POST to /api/classify in Phase 4.
   * Intentionally a no-op for now (scan UI only).
   */
  function handleAnalyze() {
    // Phase 4: POST /api/classify with FormData
    // setAppState('ANALYZING')
  }

  const viewfinderState =
    appState === 'PREVIEW' ? 'preview' : 'idle'

  return (
    <section aria-label="Phân loại rác thải" className="flex flex-col">
      {/* ── Viewfinder ──────────────────────────────── */}
      {/*
        No margin-top: viewfinder is flush to the top of the content
        area (after the main's padding-top).
      */}
      <ViewfinderFrame state={viewfinderState} imageUrl={imageUrl ?? undefined} />

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

      {/* ── Validation error (inline, below viewfinder) ─ */}
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

      {/* ── SCAN actions ──────────────────────────────── */}
      {appState === 'SCAN' && (
        <div className="mt-5 flex flex-col">
          {/* Primary: camera capture */}
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

          {/* Secondary: gallery upload */}
          <button
            id="btn-upload"
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mt-3 underline"
            style={{
              fontFamily: 'var(--font-serif-body)',
              fontSize: '13px',
              color: 'var(--color-forest)',
              /* 44px touch area via min-height */
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

      {/* ── PREVIEW actions ───────────────────────────── */}
      {appState === 'PREVIEW' && (
        <div className="mt-5 flex flex-col">
          {/* Primary: analyze */}
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

          {/* Ghost: reselect */}
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

      {/* ── Hidden file inputs ───────────────────────── */}
      {/*
        Two separate inputs:
          1. capture="environment" → opens native camera on mobile
          2. No capture → opens OS file picker (gallery / file system)
        Both are visually hidden but reachable by programmatic .click().
        tabIndex={-1} and aria-hidden prevent accidental keyboard/AT focus.
      */}
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
