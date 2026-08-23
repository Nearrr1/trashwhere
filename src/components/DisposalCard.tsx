import SectionLabel from './SectionLabel'

interface DisposalCardProps {
  /** Disposal instruction text (Vietnamese) */
  disposalAction: string
}

/**
 * DisposalCard — displays the recommended disposal action.
 *
 * Spec (screen-spec §Screen 4):
 *  - Section label: "CÁCH XỬ LÝ" (label-lg)
 *  - Body: Source Serif 4 body-base, text-pretty, ink colour
 *  - Wrapped in a semantic <section> with aria-labelledby
 */
export default function DisposalCard({ disposalAction }: DisposalCardProps) {
  return (
    <section aria-labelledby="disposal-label">
      <SectionLabel id="disposal-label">CÁCH XỬ LÝ</SectionLabel>

      <p
        className="mt-2 text-ink text-pretty"
        style={{
          fontFamily: 'var(--font-serif-body)',
          fontSize: 'var(--text-base)',
          lineHeight: 'var(--leading-relaxed)',
        }}
      >
        {disposalAction}
      </p>
    </section>
  )
}
