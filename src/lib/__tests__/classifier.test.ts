import { describe, it, expect } from 'vitest'
import {
  parseAndValidateClassificationOutput,
  ClassifierError,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  TIMEOUT_MS,
  SDK_TIMEOUT_MS,
  isRetriableProviderError,
  classifyImage,
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

describe('classifier resilience configuration', () => {
  it('uses gemini-3.5-flash-lite as DEFAULT_MODEL', () => {
    expect(DEFAULT_MODEL).toBe('gemini-3.5-flash-lite')
  })

  it('configures valid fallback models', () => {
    expect(FALLBACK_MODELS).toContain('gemini-3.1-flash-lite')
    expect(FALLBACK_MODELS).toContain('gemini-3.6-flash')
    expect(FALLBACK_MODELS).toContain('gemini-3.8-flash')
  })

  it('enforces SDK_TIMEOUT_MS < TIMEOUT_MS so SDK aborts before race fires', () => {
    expect(SDK_TIMEOUT_MS).toBeLessThan(TIMEOUT_MS)
    expect(SDK_TIMEOUT_MS).toBe(28_000)
    expect(TIMEOUT_MS).toBe(30_000)
  })
})

describe('isRetriableProviderError classification', () => {
  it('identifies 503 / UNAVAILABLE / high demand as retriable', () => {
    expect(
      isRetriableProviderError(
        new Error('503 Service Unavailable: This model is currently experiencing high demand.')
      )
    ).toBe(true)
    expect(isRetriableProviderError(new Error('UNAVAILABLE: model overloaded'))).toBe(true)
    expect(isRetriableProviderError(new Error('temporary unavailability'))).toBe(true)
  })

  it('identifies 429 / RESOURCE_EXHAUSTED / quota as retriable', () => {
    expect(isRetriableProviderError(new Error('429 Too Many Requests'))).toBe(true)
    expect(
      isRetriableProviderError(new Error('RESOURCE_EXHAUSTED: quota exceeded'))
    ).toBe(true)
    expect(isRetriableProviderError(new Error('Rate limit exceeded'))).toBe(true)
  })

  it('identifies 404 / no longer available / not found as retriable', () => {
    expect(
      isRetriableProviderError(
        new Error('This model models/gemini-2.0-flash is no longer available.')
      )
    ).toBe(true)
    expect(isRetriableProviderError(new Error('404 Not Found'))).toBe(true)
  })

  it('identifies permanent errors as non-retriable', () => {
    expect(isRetriableProviderError(new Error('API key not valid'))).toBe(false)
    expect(isRetriableProviderError(new Error('Invalid argument: image format'))).toBe(false)
    expect(isRetriableProviderError('Not an error object')).toBe(false)
    expect(isRetriableProviderError(null)).toBe(false)
    expect(isRetriableProviderError(undefined)).toBe(false)
  })
})

describe('classifyImage pre-invocation validation', () => {
  it('throws MISSING_API_KEY if GEMINI_API_KEY is not defined', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    try {
      delete process.env.GEMINI_API_KEY
      const fakeFile = new File(['mock content'], 'test.jpg', {
        type: 'image/jpeg',
      })
      await expect(classifyImage(fakeFile)).rejects.toThrow(ClassifierError)
      await expect(classifyImage(fakeFile)).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
      })
    } finally {
      if (originalKey !== undefined) {
        process.env.GEMINI_API_KEY = originalKey
      }
    }
  })
})
