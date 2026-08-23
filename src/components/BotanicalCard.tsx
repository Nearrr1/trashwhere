import type { ReactNode } from 'react'

interface BotanicalCardProps {
  children: ReactNode
  className?: string
}

/**
 * Renders a small botanical L-shaped corner mark (16×16).
 * Matches the viewfinder corner marks but smaller and in ink-muted
 * for the result card context.
 *
 * design-system §9: botanical corner marks at 16×16px, ink-muted,
 * aria-hidden, pointer-events: none.
 */
function BotanicalCorner({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const paths: Record<typeof corner, string> = {
    tl: 'M 16,0 L 0,0 L 0,16',
    tr: 'M 0,0 L 16,0 L 16,16',
    bl: 'M 0,16 L 0,0 L 16,0',
    br: 'M 0,16 L 16,16 L 16,0',
  }

  const pos: Record<typeof corner, React.CSSProperties> = {
    tl: { top: '-1px', left: '-1px' },
    tr: { top: '-1px', right: '-1px' },
    bl: { bottom: '-1px', left: '-1px' },
    br: { bottom: '-1px', right: '-1px' },
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        ...pos[corner],
      }}
    >
      <path
        d={paths[corner]}
        stroke="var(--color-ink-muted)"
        strokeWidth="1"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

/**
 * BotanicalCard — decorative card wrapper with corner SVGs.
 *
 * Spec (screen-spec §BotanicalCard):
 *  - border: 1px solid paper-rule
 *  - border-radius: radius-md (4px)
 *  - box-shadow: shadow-card
 *  - background: paper-card
 *  - position: relative for absolute-positioned corner SVGs
 *  - Four botanical SVGs at absolute corners
 */
export default function BotanicalCard({ children, className }: BotanicalCardProps) {
  return (
    <div
      className={`relative bg-paper-card overflow-hidden ${className ?? ''}`}
      style={{
        border: '1px solid var(--color-paper-rule)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <BotanicalCorner corner="tl" />
      <BotanicalCorner corner="tr" />
      <BotanicalCorner corner="bl" />
      <BotanicalCorner corner="br" />
      {children}
    </div>
  )
}
