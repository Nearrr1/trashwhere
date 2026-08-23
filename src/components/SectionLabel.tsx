import type { ReactNode } from 'react'

interface SectionLabelProps {
  /** Visible label text — use uppercase Vietnamese copy */
  children: ReactNode
  /** id for use with aria-labelledby on the parent section */
  id?: string
}

/**
 * SectionLabel — uppercase section heading label.
 *
 * Typography spec (design-system §3 `label-lg`):
 *  - 13px · Source Serif 4 · weight 500 · leading 1.5
 *  - letter-spacing 0.10em · uppercase
 *  - colour: ink-secondary
 */
export default function SectionLabel({ children, id }: SectionLabelProps) {
  return (
    <span
      id={id}
      className="block text-ink-secondary uppercase"
      style={{
        fontFamily: 'var(--font-serif-body)',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 'var(--leading-normal)',
        letterSpacing: 'var(--tracking-wider)',
      }}
    >
      {children}
    </span>
  )
}
