/**
 * Server-side classifier abstraction.
 *
 * This module connects TrashWhere to Google Gemini API using structured JSON outputs.
 * It encapsulates prompt design, model invocation, structured schema enforcement,
 * response validation, and error classification.
 *
 * It is called exclusively from the Route Handler (src/app/api/classify/route.ts)
 * and keeps provider-specific logic isolated from the rest of the application.
 */

import { GoogleGenAI, Type } from '@google/genai'
import type { ClassificationResult, WasteCategory } from '@/types/classification'

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gemini-3.5-flash'
const TIMEOUT_MS = 45_000 // 45-second bounded timeout

const VALID_CATEGORIES: ReadonlySet<WasteCategory> = new Set([
  'recyclable',
  'organic',
  'hazardous',
  'electronic',
  'general',
  'unknown',
])

// ── Error types ──────────────────────────────────────────────────────────────

export type ClassifierErrorCode =
  | 'MISSING_API_KEY'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'INVALID_RESPONSE'

export class ClassifierError extends Error {
  readonly code: ClassifierErrorCode

  constructor(code: ClassifierErrorCode, message: string) {
    super(message)
    this.name = 'ClassifierError'
    this.code = code
  }
}

// ── System Prompt & Schema ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại rác thải cho ứng dụng giáo dục TrashWhere, hướng đến học sinh trung học phổ thông tại Việt Nam.

Nhiệm vụ:
1. Quan sát và nhận diện vật thể/chất liệu chính trong ảnh.
2. Phân loại vật thể vào đúng 1 trong các danh mục sau:
   - "recyclable": Rác tái chế (giấy sạch, bìa carton, chai nhựa PET, lon nhôm, chai lọ thuỷ tinh).
   - "organic": Rác hữu cơ (thức ăn thừa, vỏ rau củ quả, bã trà, lá cây).
   - "hazardous": Rác nguy hại (pin, ắc quy, bóng đèn huỳnh quang, chai lọ hoá chất/thuốc trừ sâu, nhiệt kế thuỷ ngân).
   - "electronic": Rác điện tử (điện thoại cũ, linh kiện điện tử, dây cáp, sạc hỏng, đồ gia dụng điện tử nhỏ).
   - "general": Rác thải thông thường / rác còn lại (túi nilon bẩn, hộp xốp dính dầu mỡ, bao bì nhiều lớp, tã bỉm, cao su).
   - "unknown": Không xác định (hình ảnh mờ, bị che khuất, không có vật thể rác rõ ràng, hoặc không thể nhận biết).

Nguyên tắc quan trọng:
- Đánh giá độ tin cậy (confidence) từ 0.0 đến 1.0. Nếu ảnh mờ, không rõ chất liệu, hoặc nhiều chất liệu phức tạp lẫn lộn, hãy hạ thấp confidence (< 0.6) hoặc gán category là "unknown".
- Giải thích (explanation): Giải thích ngắn gọn, dễ hiểu bằng tiếng Việt cho học sinh, chỉ ra chất liệu chính và lý do xếp vào nhóm này.
- Hướng dẫn xử lý (disposalAction): Đưa ra các bước xử lý cụ thể, thực tế tại Việt Nam (ví dụ: đổ sạch chất lỏng, tráng sạch, phân tách nắp chai, bỏ vào thùng rác tái chế màu vàng/hộp thu gom pin tại trường học).
- TUYỆT ĐỐI KHÔNG bịa đặt tên cụ thể các trung tâm tái chế hoặc địa chỉ thu gom không có thực. Chỉ hướng dẫn quy trình xử lý chung, an toàn và đúng quy chuẩn tại trường học và gia đình.`

// ── Classifier Function ──────────────────────────────────────────────────────

/**
 * Classifies an uploaded waste image using Google Gemini Vision API with structured output.
 *
 * @param file - The server-validated image File
 * @returns Promise resolving to a domain ClassificationResult
 * @throws {ClassifierError} when API key is missing, request times out, or provider fails
 */
export async function classifyImage(file: File): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new ClassifierError(
      'MISSING_API_KEY',
      'GEMINI_API_KEY is not configured on the server.'
    )
  }

  // 1. Encode image to base64 buffer in memory (never written to disk)
  let base64Data: string
  const mimeType = file.type || 'image/jpeg'
  try {
    const arrayBuffer = await file.arrayBuffer()
    base64Data = Buffer.from(arrayBuffer).toString('base64')
  } catch (err) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      `Failed to process image buffer: ${err instanceof Error ? err.message : 'Unknown error'}`
    )
  }

  // 2. Initialize GoogleGenAI client
  const ai = new GoogleGenAI({ apiKey })

  // 3. Request structured classification with timeout protection
  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const candidateModels = Array.from(
    new Set([
      primaryModel,
      'gemini-3.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-2.5-flash-lite',
      'gemini-flash-latest',
    ])
  )

  let responseText: string | null = null
  let lastError: unknown = null

  for (const model of candidateModels) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ClassifierError('TIMEOUT', 'Classification request timed out.')),
          TIMEOUT_MS
        )
      )

      const apiCallPromise = ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: 'Hãy phân tích hình ảnh này và phân loại rác thải.',
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                enum: [
                  'recyclable',
                  'organic',
                  'hazardous',
                  'electronic',
                  'general',
                  'unknown',
                ],
                description: 'Danh mục phân loại rác chuẩn trong hệ thống TrashWhere.',
              },
              confidence: {
                type: Type.NUMBER,
                description:
                  'Điểm tự tin của mô hình từ 0.0 đến 1.0. Nếu không chắc chắn, đặt dưới 0.6.',
              },
              explanation: {
                type: Type.STRING,
                description:
                  'Giải thích ngắn gọn bằng tiếng Việt dễ hiểu cho học sinh THPT.',
              },
              disposalAction: {
                type: Type.STRING,
                description:
                  'Hướng dẫn hành động xử lý cụ thể và an toàn bằng tiếng Việt.',
              },
            },
            required: ['category', 'confidence', 'explanation', 'disposalAction'],
          },
          temperature: 0.2,
        },
      })

      const response = await Promise.race([apiCallPromise, timeoutPromise])
      responseText = response.text ?? null
      if (responseText) break
    } catch (error: unknown) {
      lastError = error
      const isQuotaError =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('quota') ||
          error.message.includes('Rate limit'))

      if (isQuotaError && model !== candidateModels[candidateModels.length - 1]) {
        // Try fallback model
        continue
      }

      if (error instanceof ClassifierError) {
        throw error
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout'))
      ) {
        throw new ClassifierError('TIMEOUT', 'Classification request timed out.')
      }
      throw new ClassifierError(
        'PROVIDER_ERROR',
        `Gemini provider encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  if (!responseText && lastError) {
    throw new ClassifierError(
      'PROVIDER_ERROR',
      `All models exhausted: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
    )
  }

  if (!responseText) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned empty response content.'
    )
  }

  // 4. Parse and validate structured output
  let parsed: unknown
  try {
    parsed = JSON.parse(responseText)
  } catch {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned non-JSON content.'
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Parsed model output is not an object.'
    )
  }

  const raw = parsed as Record<string, unknown>

  // Validate category
  if (
    typeof raw.category !== 'string' ||
    !VALID_CATEGORIES.has(raw.category as WasteCategory)
  ) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      `Model returned invalid category: ${String(raw.category)}`
    )
  }

  // Validate & normalize confidence to [0, 1]
  const rawConfidence = Number(raw.confidence)
  if (Number.isNaN(rawConfidence)) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned NaN confidence score.'
    )
  }
  const confidence = Math.max(0, Math.min(1, Math.round(rawConfidence * 100) / 100))

  // Validate explanation
  if (typeof raw.explanation !== 'string' || raw.explanation.trim() === '') {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned invalid or empty explanation.'
    )
  }

  // Validate disposalAction
  if (
    typeof raw.disposalAction !== 'string' ||
    raw.disposalAction.trim() === ''
  ) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned invalid or empty disposal action.'
    )
  }

  return {
    category: raw.category as WasteCategory,
    confidence,
    explanation: raw.explanation.trim(),
    disposalAction: raw.disposalAction.trim(),
  }
}
