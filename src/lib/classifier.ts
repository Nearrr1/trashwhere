/**
 * Server-side classifier abstraction.
 *
 * This module connects TrashWhere to the OpenAI Vision API using structured JSON outputs.
 * It encapsulates prompt design, model invocation, structured schema enforcement,
 * response validation, and error classification.
 *
 * It is called exclusively from the Route Handler (src/app/api/classify/route.ts)
 * and keeps provider-specific logic isolated from the rest of the application.
 */

import OpenAI from 'openai'
import type { ClassificationResult, WasteCategory } from '@/types/classification'

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 20_000 // 20-second bounded timeout

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

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
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
      type: 'number',
      description:
        'Điểm tự tin của mô hình từ 0.0 đến 1.0. Nếu không chắc chắn, đặt dưới 0.6.',
    },
    explanation: {
      type: 'string',
      description:
        'Giải thích ngắn gọn bằng tiếng Việt dễ hiểu cho học sinh THPT.',
    },
    disposalAction: {
      type: 'string',
      description:
        'Hướng dẫn hành động xử lý cụ thể và an toàn bằng tiếng Việt.',
    },
  },
  required: ['category', 'confidence', 'explanation', 'disposalAction'],
  additionalProperties: false,
} as const

// ── Classifier Function ──────────────────────────────────────────────────────

/**
 * Classifies an uploaded waste image using OpenAI Vision API with structured output.
 *
 * @param file - The server-validated image File
 * @returns Promise resolving to a domain ClassificationResult
 * @throws {ClassifierError} when API key is missing, request times out, or provider fails
 */
export async function classifyImage(file: File): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new ClassifierError(
      'MISSING_API_KEY',
      'OPENAI_API_KEY is not configured on the server.'
    )
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

  // 1. Encode image to base64 data URL in memory (never written to disk)
  let dataUrl: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    dataUrl = `data:${mimeType};base64,${base64}`
  } catch (err) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      `Failed to process image buffer: ${err instanceof Error ? err.message : 'Unknown error'}`
    )
  }

  // 2. Initialize OpenAI client with bounded timeout
  const openai = new OpenAI({
    apiKey,
    timeout: TIMEOUT_MS,
  })

  // 3. Request structured classification from OpenAI
  let responseContent: string | null = null
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'auto',
              },
            },
            {
              type: 'text',
              text: 'Hãy phân tích hình ảnh này và phân loại rác thải.',
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'waste_classification',
          strict: true,
          schema: CLASSIFICATION_SCHEMA,
        },
      },
      temperature: 0.2,
      max_tokens: 500,
    })

    responseContent = completion.choices[0]?.message?.content ?? null
  } catch (error: unknown) {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new ClassifierError('TIMEOUT', 'OpenAI API request timed out.')
    }
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timeout'))
    ) {
      throw new ClassifierError('TIMEOUT', 'Classification request timed out.')
    }
    throw new ClassifierError(
      'PROVIDER_ERROR',
      'OpenAI provider encountered an error.'
    )
  }

  if (!responseContent) {
    throw new ClassifierError(
      'INVALID_RESPONSE',
      'Model returned empty response content.'
    )
  }

  // 4. Parse and validate structured output
  let parsed: unknown
  try {
    parsed = JSON.parse(responseContent)
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
