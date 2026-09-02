'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, RefreshCw, AlertTriangle, X, Image as ImageIcon } from 'lucide-react'
import ViewfinderFrame from './ViewfinderFrame'
import ClassificationResultCard from './ClassificationResult'
import ErrorState from './ErrorState'
import type { ErrorCode } from './ErrorState'
import type {
  AppState,
  ClassificationResult,
} from '@/types/classification'
import {
  isCameraSupported,
  startCameraStream,
  stopCameraStream,
  captureVideoFrame,
  formatCameraError,
  type FacingMode,
} from '@/lib/camera'

// ── Types ──────────────────────────────────────────────────────────────

export interface ValidationError {
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
export function validateFile(file: File): ValidationError | null {
  if (!ACCEPTED_MIME.has(file.type)) {
    return {
      message:
        'Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
    }
  }
  if (file.size === 0) {
    return {
      message: 'Tệp rỗng hoặc không có dữ liệu. Vui lòng chọn ảnh hợp lệ.',
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
 * ImageUploader — the core interactive component for the scan flow (Phase 7A).
 *
 * Supports dual input sources:
 *   1. Direct in-browser Camera Scan via WebRTC getUserMedia.
 *   2. File selection from device gallery.
 *
 * Both sources converge to the same captured File/Blob, validated identically,
 * and submitted to the existing /api/classify endpoint.
 */
export default function ImageUploader() {
  const [appState, setAppState] = useState<AppState>('SCAN')
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const [cameraFacingMode, setCameraFacingMode] = useState<FacingMode>('environment')
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [classificationResult, setClassificationResult] =
    useState<ClassificationResult | null>(null)
  const [errorCode, setErrorCode] = useState<ErrorCode>('UNKNOWN')

  const galleryRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isAnalyzingRef = useRef<boolean>(false)
  const cameraRequestIdRef = useRef<number>(0)

  // ── Camera Lifecycle ────────────────────────────────────────────────

  const stopActiveStream = useCallback(() => {
    cameraRequestIdRef.current++
    if (streamRef.current) {
      stopCameraStream(streamRef.current)
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(
    async (facingMode: FacingMode = 'environment') => {
      stopActiveStream()
      const requestId = ++cameraRequestIdRef.current
      setCameraError(null)
      setValidationError(null)

      const support = isCameraSupported()
      if (!support.supported) {
        if (support.reason === 'INSECURE_CONTEXT') {
          setCameraError(
            'Camera yêu cầu kết nối bảo mật (HTTPS hoặc localhost). Vui lòng tải ảnh lên từ thư viện.'
          )
        } else {
          setCameraError(
            'Trình duyệt không hỗ trợ quét camera trực tiếp. Vui lòng tải ảnh lên từ thư viện.'
          )
        }
        setIsCameraActive(false)
        return
      }

      try {
        const stream = await startCameraStream(facingMode)
        // Guard against race condition: user closed or flipped camera while stream was starting
        if (cameraRequestIdRef.current !== requestId) {
          stopCameraStream(stream)
          return
        }
        streamRef.current = stream
        setCameraFacingMode(facingMode)
        setIsCameraActive(true)

        // Ensure video element receives the stream once mounted
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch {
            // Autoplay or element-unmounted error ignored
          }
        }
      } catch (err: unknown) {
        if (cameraRequestIdRef.current !== requestId) return
        stopActiveStream()
        setIsCameraActive(false)
        setCameraError(formatCameraError(err))
      }
    },
    [stopActiveStream]
  )

  // Attach stream when video element ref becomes available
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isCameraActive])

  // Stop camera and cleanup on unmount
  useEffect(() => {
    return () => {
      isAnalyzingRef.current = false
      stopActiveStream()
      abortControllerRef.current?.abort()
    }
  }, [stopActiveStream])

  // ── Object URL lifecycle ───────────────────────────────────────────

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

  // ── Capture from Camera ─────────────────────────────────────────────

  async function handleCaptureFromCamera() {
    if (!videoRef.current || isCapturing) return
    setIsCapturing(true)
    setCameraError(null)

    try {
      const file = await captureVideoFrame(videoRef.current, 0.92)
      // Stop camera stream immediately upon successful capture
      stopActiveStream()
      setIsCameraActive(false)

      const err = validateFile(file)
      if (err) {
        setValidationError(err.message)
        setIsCapturing(false)
        return
      }

      setValidationError(null)
      revokeUrl()
      setSelectedFile(file)
      setImageUrl(URL.createObjectURL(file))
      setClassificationResult(null)
      setAppState('PREVIEW')
    } catch (err: unknown) {
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Không thể chụp ảnh từ camera. Vui lòng thử lại.'
      )
    } finally {
      setIsCapturing(false)
    }
  }

  function handleToggleCameraFacing() {
    const nextMode: FacingMode =
      cameraFacingMode === 'environment' ? 'user' : 'environment'
    startCamera(nextMode)
  }

  function handleCloseCamera() {
    stopActiveStream()
    setIsCameraActive(false)
    setCameraError(null)
  }

  // ── File handling ──────────────────────────────────────────────────

  function handleFileSelected(file: File) {
    isAnalyzingRef.current = false
    stopActiveStream()
    setIsCameraActive(false)
    setCameraError(null)

    const err = validateFile(file)
    if (err) {
      setValidationError(err.message)
      return
    }
    setValidationError(null)
    revokeUrl()
    setSelectedFile(file)
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
    isAnalyzingRef.current = false
    abortControllerRef.current?.abort()
    if (galleryRef.current) galleryRef.current.value = ''
    revokeUrl()
    setSelectedFile(null)
    setValidationError(null)
    setClassificationResult(null)
    setErrorCode('UNKNOWN')
    setAppState('SCAN')
  }

  async function handleAnalyze() {
    if (!selectedFile || isAnalyzingRef.current) return
    isAnalyzingRef.current = true

    // Immediately enter ANALYZING — do not wait
    setAppState('ANALYZING')

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch('/api/classify', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      // Guard against race conditions if aborted during fetch
      if (controller.signal.aborted) return

      if (response.ok) {
        const result: ClassificationResult = await response.json()
        if (controller.signal.aborted) return
        setClassificationResult(result)
        setAppState('RESULT')
      } else {
        const errorData = await response.json().catch(() => null)
        if (controller.signal.aborted) return
        const code: ErrorCode = (errorData?.code ||
          errorData?.error ||
          'UNKNOWN') as ErrorCode
        setErrorCode(code)
        setAppState('ERROR')
      }
    } catch (error: unknown) {
      // AbortError means the user cancelled — don't show error state
      if (
        (error instanceof DOMException && error.name === 'AbortError') ||
        controller.signal.aborted
      ) {
        return
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorCode('NETWORK')
      } else {
        setErrorCode('UNKNOWN')
      }
      setAppState('ERROR')
    } finally {
      isAnalyzingRef.current = false
    }
  }

  function handleRescan() {
    isAnalyzingRef.current = false
    abortControllerRef.current?.abort()
    if (galleryRef.current) galleryRef.current.value = ''
    revokeUrl()
    setSelectedFile(null)
    setValidationError(null)
    setClassificationResult(null)
    setErrorCode('UNKNOWN')
    setAppState('SCAN')
  }

  function handleRetry() {
    isAnalyzingRef.current = false
    abortControllerRef.current?.abort()
    if (galleryRef.current) galleryRef.current.value = ''
    revokeUrl()
    setSelectedFile(null)
    setValidationError(null)
    setClassificationResult(null)
    setErrorCode('UNKNOWN')
    setAppState('SCAN')
  }

  // ── Derived state ─────────────────────────────────────────────────

  const viewfinderState =
    appState === 'ANALYZING'
      ? 'loading'
      : appState === 'PREVIEW'
        ? 'preview'
        : isCameraActive
          ? 'camera'
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
            videoRef={videoRef}
          />

          {/* ── Tagline (SCAN state only when camera idle) ──── */}
          {appState === 'SCAN' && !isCameraActive && (
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

      {/* ── Camera error alert ─── */}
      {cameraError && (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-2 rounded-sm p-3.5"
          style={{
            backgroundColor: 'var(--color-cat-hazardous-tint)',
            borderLeft: '4px solid var(--color-terra)',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={20}
              strokeWidth={2}
              aria-hidden="true"
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--color-terra)' }}
            />
            <p
              className="text-ink text-sm flex-1"
              style={{
                fontFamily: 'var(--font-serif-body)',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              {cameraError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="self-start underline font-medium text-xs mt-1"
            style={{ color: 'var(--color-forest)' }}
          >
            Tải ảnh từ thư viện thay thế →
          </button>
        </div>
      )}

      {/* ── File validation error ─── */}
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
          {isCameraActive ? (
            /* Active Camera Controls */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  id="btn-capture"
                  type="button"
                  onClick={handleCaptureFromCamera}
                  disabled={isCapturing}
                  aria-label="Chụp ảnh từ camera"
                  className="flex-1 flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors shadow-sm"
                  style={{
                    height: '56px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    fontWeight: 500,
                    transitionDuration: 'var(--duration-fast)',
                  }}
                >
                  <Camera size={20} strokeWidth={1.5} aria-hidden="true" />
                  {isCapturing ? 'Đang chụp...' : 'Chụp ảnh'}
                </button>

                <button
                  id="btn-flip-camera"
                  type="button"
                  onClick={handleToggleCameraFacing}
                  aria-label="Đổi hướng camera trước/sau"
                  title="Đổi camera"
                  className="flex items-center justify-center bg-paper-card border border-sand hover:bg-sand-light text-forest rounded-md transition-colors"
                  style={{
                    width: '56px',
                    height: '56px',
                    flexShrink: 0,
                  }}
                >
                  <RefreshCw size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <button
                id="btn-close-camera"
                type="button"
                onClick={handleCloseCamera}
                className="mt-1"
                style={{
                  fontFamily: 'var(--font-serif-body)',
                  fontSize: '13px',
                  color: 'var(--color-ink-secondary)',
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
                <X size={14} className="mr-1 inline" /> Đóng camera
              </button>
            </div>
          ) : (
            /* Idle SCAN Controls: Open Camera or Upload from Gallery */
            <>
              <button
                id="btn-open-camera"
                type="button"
                onClick={() => startCamera('environment')}
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
                Quét bằng Camera
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
                <ImageIcon size={14} className="mr-1.5 inline" />
                hoặc tải lên từ thư viện
              </button>
            </>
          )}
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
            Chụp lại / Chọn ảnh khác
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
        <ErrorState code={errorCode} onRetry={handleRetry} />
      )}

      {/* ── Hidden gallery file input ──────────────────────── */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={handleInputChange}
      />
    </section>
  )
}
