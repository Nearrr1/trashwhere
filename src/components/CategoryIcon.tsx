import {
  Recycle,
  Leaf,
  AlertTriangle,
  Zap,
  Trash2,
  HelpCircle,
} from 'lucide-react'
import type { WasteCategory } from '@/types/classification'

// ── Icon map (design-system §9 — Category icon map) ─────────────────────────

const ICON_MAP: Record<
  WasteCategory,
  React.ComponentType<{ size: number; strokeWidth: number; 'aria-hidden': 'true'; className?: string; style?: React.CSSProperties }>
> = {
  recyclable: Recycle,
  organic: Leaf,
  hazardous: AlertTriangle,
  electronic: Zap,
  general: Trash2,
  unknown: HelpCircle,
}

// ── Component ───────────────────────────────────────────────────────────────

interface CategoryIconProps {
  category: WasteCategory
  /** Icon size in px (default: 32 — result card context) */
  size?: number
  className?: string
}

/**
 * CategoryIcon — renders the Lucide icon for a waste category.
 *
 * Spec (design-system §9):
 *  - Rendered in category accent colour (via CSS custom property)
 *  - Always paired with a text label (never colour-alone)
 *  - aria-hidden="true" — decorative only
 */
export default function CategoryIcon({
  category,
  size = 32,
  className,
}: CategoryIconProps) {
  const Icon = ICON_MAP[category]
  return (
    <Icon
      size={size}
      strokeWidth={1.5}
      aria-hidden="true"
      className={className}
      style={{ color: `var(--color-cat-${category})` }}
    />
  )
}
