/**
 * Mock classifier — returns a deterministic ClassificationResult after a delay.
 *
 * This module replaces the real AI provider call during Phase 3.
 * When /api/classify is implemented (Phase 4), this module is deleted and
 * ImageUploader's fetch call replaces the mock.
 *
 * Architecture: the caller passes an AbortSignal so the mock respects
 * the same cancellation contract as a real fetch.
 */

import type { ClassificationResult } from '@/types/classification'

/** Realistic delay simulating a mid-range AI API response on 4G (ms). */
const MOCK_DELAY_MS = 1500

/**
 * Deterministic mock results — one per category for testing all UI states.
 * The first entry (recyclable) is the default happy-path result.
 */
const MOCK_RESULTS: ClassificationResult[] = [
  {
    category: 'recyclable',
    confidence: 0.94,
    explanation:
      'Chai nhựa PET được làm từ nhựa polyethylene terephthalate — một loại nhựa có thể tái chế hoàn toàn. Vật liệu này được thu gom, nghiền nhỏ, và tái chế thành sợi polyester hoặc chai mới, giúp giảm thiểu lượng rác nhựa ra môi trường.',
    disposalAction:
      'Rửa sạch và để khô chai trước khi bỏ. Bỏ vào thùng rác tái chế màu vàng hoặc mang đến điểm thu gom nhựa tại trường học hoặc siêu thị gần nhất.',
  },
  {
    category: 'hazardous',
    confidence: 0.91,
    explanation:
      'Pin AA chứa các kim loại nặng như kẽm, mangan, và trong một số loại là thủy ngân hoặc cadmium. Các chất này rất độc hại với đất và nguồn nước ngầm nếu bị chôn lấp cùng rác thông thường.',
    disposalAction:
      'Tuyệt đối không bỏ pin vào thùng rác thông thường. Mang đến điểm thu gom pin tại siêu thị, nhà thuốc, hoặc điểm thu gom rác thải nguy hại của địa phương.',
  },
  {
    category: 'organic',
    confidence: 0.88,
    explanation:
      'Vỏ trái cây là rác hữu cơ có thể phân hủy sinh học. Khi được xử lý đúng cách, chúng có thể trở thành phân compost giàu dinh dưỡng, tốt cho đất trồng và giảm lượng khí methane thải ra từ bãi chôn lấp.',
    disposalAction:
      'Bỏ vào thùng rác hữu cơ hoặc thùng ủ compost. Nếu trường hoặc khu phố có chương trình thu gom rác hữu cơ, hãy tham gia để rác được xử lý đúng cách.',
  },
  {
    // Low-confidence result for testing the warning UI
    category: 'unknown',
    confidence: 0.42,
    explanation:
      'Không thể xác định rõ loại vật liệu từ hình ảnh này. Có thể là nhựa hỗn hợp hoặc vật liệu tổng hợp.',
    disposalAction:
      'Thử chụp lại với ánh sáng tốt hơn. Nếu vẫn không xác định được, hãy liên hệ cơ sở thu gom rác địa phương để được tư vấn.',
  },
]

/** Index cycling through mock results on each call (for testing variety). */
let mockIndex = 0

/**
 * Returns a mock ClassificationResult after MOCK_DELAY_MS.
 * Throws a DOMException with name "AbortError" if the signal is aborted.
 *
 * Usage:
 *   const controller = new AbortController()
 *   const result = await getMockClassification(controller.signal)
 */
export function getMockClassification(
  signal: AbortSignal
): Promise<ClassificationResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeoutId = setTimeout(() => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      const result = MOCK_RESULTS[mockIndex % MOCK_RESULTS.length]
      mockIndex++
      resolve(result)
    }, MOCK_DELAY_MS)

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}
