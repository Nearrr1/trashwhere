import { describe, it, expect } from 'vitest'
import {
  WASTE_CATEGORIES,
  getCategoryMeta,
  getCategoryZoneStyle,
} from '../waste-categories'
import type { WasteCategory } from '@/types/classification'

describe('waste-categories', () => {
  it('contains exactly 6 canonical categories with unknown at the end', () => {
    expect(WASTE_CATEGORIES).toHaveLength(6)
    const ids = WASTE_CATEGORIES.map(c => c.id)
    expect(ids).toEqual([
      'recyclable',
      'organic',
      'hazardous',
      'electronic',
      'general',
      'unknown',
    ])
  })

  it('provides complete educational metadata for every category', () => {
    for (const cat of WASTE_CATEGORIES) {
      expect(cat.label.trim().length).toBeGreaterThan(0)
      expect(cat.examples.trim().length).toBeGreaterThan(0)
      expect(cat.accentVar).toMatch(/^--color-cat-/)
      expect(cat.tintVar).toMatch(/^--color-cat-.*-tint$/)

      expect(cat.edu.environmentalImpact.trim().length).toBeGreaterThan(10)
      expect(cat.edu.disposalDetail.trim().length).toBeGreaterThan(10)
      expect(cat.edu.keyFact.highlight.trim().length).toBeGreaterThan(0)
    }
  })

  it('looks up category metadata by valid ID', () => {
    const recyclable = getCategoryMeta('recyclable')
    expect(recyclable.label).toBe('Rác tái chế')
    expect(recyclable.id).toBe('recyclable')

    const organic = getCategoryMeta('organic')
    expect(organic.label).toBe('Rác hữu cơ')
  })

  it('throws an error when looking up an invalid category ID', () => {
    expect(() => getCategoryMeta('invalid_cat' as WasteCategory)).toThrow(
      'Unknown waste category: invalid_cat'
    )
  })

  it('generates correct CSS zone style properties', () => {
    const style = getCategoryZoneStyle('hazardous')
    expect(style.borderLeft).toBe('4px solid var(--color-cat-hazardous)')
    expect(style.backgroundColor).toBe('var(--color-cat-hazardous-tint)')
  })
})
