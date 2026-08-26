'use client'

import { Camera } from 'lucide-react'

/** Visual state passed down from ImageUploader */
export type ViewfinderState = 'idle' | 'camera' | 'preview' | 'loading'

interface ViewfinderFrameProps {
  state: ViewfinderState
  /** blob: URL from URL.createObjectURL — only present in preview / loading states */
  imageUrl?: string
  /** Ref to the HTML5 video element when camera is active */
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

/**
 * Renders one L-shaped corner mark at the given corner.
 *
 * Spec (screen-spec §ViewfinderFrame):
 *  - L-shaped SVG, 20px each leg, 2px stroke, forest colour
 *  - Positioned 12px from the edge
 *  - During ANALYZING (loading): pulsing via .viewfinder-corner-mark CSS class
 */
function CornerMark({
  corner,
  pulsing,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  pulsing: boolean
}) {
  const paths: Record<typeof corner, string> = {
    tl: 'M 20,0 L 0,0 L 0,20',
    tr: 'M 0,0 L 20,0 L 20,20',
    bl: 'M 0,20 L 0,0 L 20,0',
    br: 'M 0,20 L 20,20 L 20,0',
  }

  const pos: Record<typeof corner, React.CSSProperties> = {
    tl: { top: '12px', left: '12px' },
    tr: { top: '12px', right: '12px' },
    bl: { bottom: '12px', left: '12px' },
    br: { bottom: '12px', right: '12px' },
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={pulsing ? 'viewfinder-corner-mark' : undefined}
      style={{ position: 'absolute', pointerEvents: 'none', ...pos[corner] }}
    >
      <path
        d={paths[corner]}
        stroke="var(--color-forest)"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

/**
 * ViewfinderFrame — the rectangular camera viewfinder area.
 *
 * Supports:
 *  - IDLE: Camera icon placeholder
 *  - CAMERA: Live HTML5 <video> stream with object-fit: cover
 *  - PREVIEW: Fills with captured/selected image (object-fit: cover)
 *  - LOADING: Image at 85% opacity, pulsing corner marks
 */
export default function ViewfinderFrame({
  state,
  imageUrl,
  videoRef,
}: ViewfinderFrameProps) {
  const showImage = (state === 'preview' || state === 'loading') && !!imageUrl
  const showVideo = state === 'camera'
  const pulsing = state === 'loading'

  return (
    <div
      className="relative w-full bg-paper-card overflow-hidden rounded-sm"
      style={{ aspectRatio: '16 / 10' }}
      aria-label={
        showVideo
          ? 'Khung ngắm camera trực tiếp'
          : showImage
            ? 'Ảnh đã chụp hoặc đã chọn'
            : 'Khung ngắm camera'
      }
    >
      {/* ── Content layer ─────────────────────────────── */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Luồng video từ camera"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Ảnh đã chọn để phân tích"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: pulsing ? 0.85 : 1 }}
        />
      ) : (
        /* SCAN / IDLE placeholder */
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera
            size={32}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: 'var(--color-forest)', opacity: 0.4 }}
          />
        </div>
      )}

      {/* ── Subtle guide for active camera ────────────── */}
      {showVideo && (
        <div
          className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="px-2.5 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'rgba(24, 38, 28, 0.65)',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-sans)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Đặt vật thể vào giữa khung
          </span>
        </div>
      )}

      {/* ── Corner marks (always rendered) ────────────── */}
      <CornerMark corner="tl" pulsing={pulsing} />
      <CornerMark corner="tr" pulsing={pulsing} />
      <CornerMark corner="bl" pulsing={pulsing} />
      <CornerMark corner="br" pulsing={pulsing} />
    </div>
  )
}
