import { HelpCircle } from 'lucide-react'
import AuthButton from './AuthButton'

/**
 * PageHeader — persistent top bar.
 *
 * Spec (screen-spec §AppShell / PageHeader):
 *  - Height: 52px
 *  - Background: forest (#1a3a2a)
 *  - Wordmark: "TrashWhere" · Playfair Display 400 italic · 18px · paper colour
 *  - Right action: AuthButton + HelpCircle icon · 22px · paper 80% opacity
 *  - Padding: 20px left, 16px right
 *  - Border-bottom: 1px solid forest-hover
 */
export default function PageHeader() {
  return (
    <header
      className="flex items-center justify-between bg-forest shrink-0"
      style={{
        height: '52px',
        paddingLeft: '20px',
        paddingRight: '16px',
        borderBottom: '1px solid var(--color-forest-hover)',
      }}
    >
      {/* Wordmark */}
      <span
        className="text-paper select-none"
        style={{
          fontFamily: 'var(--font-serif-display)',
          fontSize: '18px',
          fontWeight: 400,
          fontStyle: 'italic',
          lineHeight: 1.2,
        }}
        aria-label="TrashWhere"
      >
        TrashWhere
      </span>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <AuthButton />

        {/* Help action — no-op in MVP */}
        <button
          type="button"
          aria-label="Trợ giúp"
          className="flex items-center justify-center text-paper focus-visible:outline-paper"
          style={{ width: '36px', height: '36px', opacity: 0.8 }}
        >
          <HelpCircle size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
