/**
 * Waste category definitions — single source of truth.
 *
 * product-brief.md §Initial Waste Taxonomy:
 * "All category values must be defined in one place and never duplicated."
 *
 * Any change to WasteCategory values must be reflected here only.
 * Do not hardcode category strings elsewhere in the codebase.
 */

import type { WasteCategory } from '@/types/classification'

// ── Category metadata ──────────────────────────────────────────────────────

export interface CategoryMeta {
  id: WasteCategory
  /** Display label in Vietnamese */
  label: string
  /** Short example list for UI tooltips / learn page */
  examples: string
  /** CSS custom property name for the accent colour */
  accentVar: string
  /** CSS custom property name for the tint background */
  tintVar: string
}

/**
 * Ordered list of all valid waste categories.
 * The `unknown` category is always last and is reserved for low-confidence
 * results (confidence < 0.6).
 */
export const WASTE_CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'recyclable',
    label: 'Rác tái chế',
    examples: 'Giấy, nhựa PET, lon nhôm, thuỷ tinh',
    accentVar: '--color-cat-recyclable',
    tintVar: '--color-cat-recyclable-tint',
  },
  {
    id: 'organic',
    label: 'Rác hữu cơ',
    examples: 'Thức ăn thừa, vỏ trái cây, lá cây',
    accentVar: '--color-cat-organic',
    tintVar: '--color-cat-organic-tint',
  },
  {
    id: 'hazardous',
    label: 'Rác nguy hại',
    examples: 'Pin, bóng đèn huỳnh quang, hoá chất',
    accentVar: '--color-cat-hazardous',
    tintVar: '--color-cat-hazardous-tint',
  },
  {
    id: 'electronic',
    label: 'Rác điện tử',
    examples: 'Điện thoại cũ, dây cáp, phụ kiện',
    accentVar: '--color-cat-electronic',
    tintVar: '--color-cat-electronic-tint',
  },
  {
    id: 'general',
    label: 'Rác thải thông thường',
    examples: 'Bao bì nhiều lớp, tã, cao su',
    accentVar: '--color-cat-general',
    tintVar: '--color-cat-general-tint',
  },
  {
    id: 'unknown',
    label: 'Không xác định',
    examples: 'Độ chính xác thấp hoặc hình ảnh không rõ',
    accentVar: '--color-cat-unknown',
    tintVar: '--color-cat-unknown-tint',
  },
] as const

/** Look up category metadata by ID. Throws if not found (should not happen). */
export function getCategoryMeta(id: WasteCategory): CategoryMeta {
  const meta = WASTE_CATEGORIES.find(c => c.id === id)
  if (!meta) throw new Error(`Unknown waste category: ${id}`)
  return meta
}

/** Returns inline style object for a category zone (left border + tint bg). */
export function getCategoryZoneStyle(id: WasteCategory): React.CSSProperties {
  const { accentVar, tintVar } = getCategoryMeta(id)
  return {
    borderLeft: `4px solid var(${accentVar})`,
    backgroundColor: `var(${tintVar})`,
  }
}
