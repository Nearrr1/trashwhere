/**
 * Server-side classifier abstraction.
 *
 * This function serves as the single abstraction boundary between the Route Handler
 * and the classification engine. During Phase 4A, it returns deterministic mock data
 * adhering to the ClassificationResult contract.
 *
 * In subsequent phases, concrete AI vision providers (e.g. Gemini Vision) will be
 * wired in here without modifying the API contract or client components.
 */

import type { ClassificationResult } from '@/types/classification'

/**
 * Classifies an uploaded waste image.
 *
 * @param file - The server-validated image File
 * @returns Promise resolving to a domain ClassificationResult
 */
export async function classifyImage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  file: File
): Promise<ClassificationResult> {
  // Deterministic realistic Vietnamese response for Phase 4A
  return {
    category: 'recyclable',
    confidence: 0.94,
    explanation:
      'Chai nhựa PET được làm từ nhựa polyethylene terephthalate — một loại nhựa có thể tái chế hoàn toàn. Vật liệu này được thu gom, nghiền nhỏ, và tái chế thành sợi polyester hoặc chai mới, giúp giảm thiểu lượng rác nhựa ra môi trường.',
    disposalAction:
      'Đổ hết chất lỏng, tráng sạch nếu cần, để khô và bỏ vào nhóm rác tái chế màu vàng hoặc mang đến điểm thu gom tái chế.',
  }
}
