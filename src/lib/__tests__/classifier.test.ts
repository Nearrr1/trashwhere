import { describe, it, expect } from 'vitest'
import {
  parseAndValidateClassificationOutput,
  ClassifierError,
} from '../classifier'

describe('classifier structured output validation', () => {
  it('parses valid structured JSON output correctly', () => {
    const validJson = JSON.stringify({
      category: 'recyclable',
      confidence: 0.95,
      explanation: 'Chai nhựa PET trong suốt có thể tái chế.',
      disposalAction: 'Tráng sạch nước và bỏ vào thùng rác tái chế màu vàng.',
    })

    const result = parseAndValidateClassificationOutput(validJson)
    expect(result.category).toBe('recyclable')
    expect(result.confidence).toBe(0.95)
    expect(result.explanation).toBe(
      'Chai nhựa PET trong suốt có thể tái chế.'
    )
    expect(result.disposalAction).toBe(
      'Tráng sạch nước và bỏ vào thùng rác tái chế màu vàng.'
    )
  })

  it('clamps confidence scores to [0.00, 1.00] range and rounds to 2 decimals', () => {
    const jsonOver = JSON.stringify({
      category: 'organic',
      confidence: 1.45,
      explanation: 'Vỏ chuối hữu cơ.',
      disposalAction: 'Bỏ vào thùng rác hữu cơ.',
    })
    const resOver = parseAndValidateClassificationOutput(jsonOver)
    expect(resOver.confidence).toBe(1.0)

    const jsonUnder = JSON.stringify({
      category: 'hazardous',
      confidence: -0.2,
      explanation: 'Pin cũ.',
      disposalAction: 'Đem tới điểm thu gom.',
    })
    const resUnder = parseAndValidateClassificationOutput(jsonUnder)
    expect(resUnder.confidence).toBe(0.0)
  })

  it('caps excessively long explanation and disposalAction strings (UI protection)', () => {
    const longText = 'A'.repeat(1500)
    const jsonLong = JSON.stringify({
      category: 'electronic',
      confidence: 0.88,
      explanation: longText,
      disposalAction: longText,
    })

    const res = parseAndValidateClassificationOutput(jsonLong)
    expect(res.explanation.length).toBeLessThanOrEqual(1003) // 1000 + '...'
    expect(res.explanation.endsWith('...')).toBe(true)
    expect(res.disposalAction.length).toBeLessThanOrEqual(1003)
  })

  it('rejects invalid non-JSON output', () => {
    expect(() =>
      parseAndValidateClassificationOutput('This is plain text, not JSON')
    ).toThrow(ClassifierError)
  })

  it('rejects unrecognized categories', () => {
    const invalidCatJson = JSON.stringify({
      category: 'nuclear_waste',
      confidence: 0.9,
      explanation: 'Chất thải lạ.',
      disposalAction: 'Tránh xa.',
    })
    expect(() =>
      parseAndValidateClassificationOutput(invalidCatJson)
    ).toThrow(ClassifierError)
  })

  it('rejects NaN confidence values', () => {
    const nanJson = JSON.stringify({
      category: 'general',
      confidence: 'not_a_number',
      explanation: 'Rác chung.',
      disposalAction: 'Vứt thùng rác.',
    })
    expect(() => parseAndValidateClassificationOutput(nanJson)).toThrow(
      ClassifierError
    )
  })

  it('rejects empty explanation or disposalAction', () => {
    const emptyExpJson = JSON.stringify({
      category: 'general',
      confidence: 0.8,
      explanation: '   ',
      disposalAction: 'Vứt thùng rác.',
    })
    expect(() => parseAndValidateClassificationOutput(emptyExpJson)).toThrow(
      ClassifierError
    )

    const emptyDispJson = JSON.stringify({
      category: 'general',
      confidence: 0.8,
      explanation: 'Rác chung.',
      disposalAction: '',
    })
    expect(() =>
      parseAndValidateClassificationOutput(emptyDispJson)
    ).toThrow(ClassifierError)
  })
})
