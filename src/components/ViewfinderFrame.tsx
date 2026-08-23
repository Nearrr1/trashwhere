'use client'

import { Camera } from 'lucide-react'

/** Visual state passed down from ImageUploader */
export type ViewfinderState = 'idle' | 'preview' | 'loading'

interface ViewfinderFrameProps {
  state: ViewfinderState
  /** blob: URL from URL.createObjectURL — only present in preview / loading states */
  imageUrl?: string
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
  /**
   * SVG paths — each is a two-segment L-shape drawn inside a 20×20 viewbox.
   * Stroke-linecap "square" gives the field-guide bracket look.
   */
  const paths: Record<typeof corner, string> = {
    tl: 'M 20,0 L 0,0 L 0,20',
    tr: 'M 0,0 L 20,0 L 20,20',
    bl: 'M 0,20 L 0,0 L 20,0',   // flipped: goes up then right
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
 * Spec (screen-spec §Screen 1 ViewfinderFrame):
 *  - aspect-ratio: 16/10, full content width, bg: paper-card
 *  - Corner marks at 12px from each edge, forest colour, 20px legs
 *  - SCAN: centred Camera icon at 40% forest opacity
 *  - PREVIEW: fills with the selected image (object-fit: cover)
 *  - LOADING: image at 85% opacity, corner marks pulse
 */
export default function ViewfinderFrame({ state, imageUrl }: ViewfinderFrameProps) {
  const showImage = (state === 'preview' || state === 'loading') && !!imageUrl
  const pulsing = state === 'loading'

  return (
    <div
      className="relative w-full bg-paper-card overflow-hidden"
      style={{ aspectRatio: '16 / 10' }}
      aria-hidden={state === 'idle'}
    >
      {/* ── Content layer ─────────────────────────────── */}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Ảnh đã chọn để phân tích"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: pulsing ? 0.85 : 1 }}
        />
      ) : (
        /* SCAN placeholder */
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera
            size={32}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: 'var(--color-forest)', opacity: 0.4 }}
          />
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
