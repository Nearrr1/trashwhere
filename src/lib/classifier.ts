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

/**
 * Default primary model — gemini-2.5-flash is the stable Gemini 2.x Flash
 * model confirmed available in @google/genai SDK v2.18.0.
 *
 * gemini-3.5-flash (previous value) was confirmed to return HTTP 503
 * "high demand" / silent TCP hangs in production (see instrumentation report).
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash'

/**
 * Application-level Promise.race timeout (safety net).
 * The SDK timeout (SDK_TIMEOUT_MS) fires first and cancels the request;
 * this value is a backstop in case the SDK abort fails.
 */
export const TIMEOUT_MS = 30_000

/**
 * SDK-level HTTP timeout passed via httpOptions.timeout.
 * Must be strictly less than TIMEOUT_MS so the SDK cancels the HTTP request
 * before the Promise.race fires, guaranteeing actual request abort.
 */
export const SDK_TIMEOUT_MS = 28_000

/**
 * Ordered fallback model list.
 * All entries are confirmed present in @google/genai SDK v2.18.0 type definitions.
 * The primary model is prepended at runtime (from env or DEFAULT_MODEL).
 */
export const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
] as const

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

// ── Retry classification helpers ─────────────────────────────────────────────

/**
 * Returns true for errors that are temporary provider-side availability issues
 * where retrying with a different model is appropriate:
 * - HTTP 429 / RESOURCE_EXHAUSTED / quota / rate limit (capacity)
 * - HTTP 503 / UNAVAILABLE / high demand / temporary unavailability (overload)
 *
 * Returns false for permanent failures (bad API key, invalid image, etc.) where
 * retrying with another model will not help.
 */
export function isRetriableProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('temporary') ||
    msg.includes('service unavailable')
  )
}

// ── Classifier Function ──────────────────────────────────────────────────────

// Maximum allowed characters for AI-generated text fields to prevent UI overflow
const MAX_TEXT_FIELD_LENGTH = 1000

/**
 * Validates and normalizes structured output from AI model responses.
 * Enforces JSON formatting, category membership, confidence score normalization,
 * and text length bounds.
 *
 * @param jsonText - Raw string from model output
 * @returns Validated ClassificationResult
 * @throws {ClassifierError} on malformed JSON, invalid category, NaN confidence, or empty strings
 */
export function parseAndValidateClassificationOutput(
  jsonText: string
): ClassificationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
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
  const confidence = Math.max(
    0,
    Math.min(1, Math.round(rawConfidence * 100) / 100)
  )

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

  let explanation = raw.explanation.trim()
  if (explanation.length > MAX_TEXT_FIELD_LENGTH) {
    explanation = explanation.slice(0, MAX_TEXT_FIELD_LENGTH).trimEnd() + '...'
  }

  let disposalAction = raw.disposalAction.trim()
  if (disposalAction.length > MAX_TEXT_FIELD_LENGTH) {
    disposalAction =
      disposalAction.slice(0, MAX_TEXT_FIELD_LENGTH).trimEnd() + '...'
  }

  return {
    category: raw.category as WasteCategory,
    confidence,
    explanation,
    disposalAction,
  }
}

/**
 * Classifies an uploaded waste image using Google Gemini Vision API with structured output.
 *
 * Resilience strategy:
 * - Primary: GEMINI_MODEL env var, falling back to DEFAULT_MODEL (gemini-2.5-flash).
 * - Retriable errors (503 UNAVAILABLE, 429, quota, high demand, timeout) trigger fallback
 *   to the next candidate model automatically.
 * - SDK-level httpOptions.timeout (28s) cancels the underlying HTTP request before the
 *   application-level Promise.race timeout (30s) fires, preventing silent TCP hangs.
 * - All models failing returns ClassifierError('PROVIDER_ERROR').
 * - Non-retriable errors surface immediately.
 *
 * @param file - The server-validated image File
 * @returns Promise resolving to a domain ClassificationResult
 * @throws {ClassifierError} when API key is missing, all models fail, or response is invalid
 */
export async function classifyImage(file: File): Promise<ClassificationResult> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()

  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL

  // ── Production log: classification entry ─────────────────────────────
  console.log(
    JSON.stringify({
      event: 'CLASSIFY_START',
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      primaryModel,
      hasApiKey: !!apiKey,
      timeoutMs: TIMEOUT_MS,
      sdkTimeoutMs: SDK_TIMEOUT_MS,
      ts: Date.now(),
    })
  )

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

  // 2. Build candidate model list: primary first, then fallbacks (deduped)
  const candidateModels = Array.from(
    new Set([primaryModel, ...FALLBACK_MODELS])
  )

  let responseText: string | null = null
  let lastError: unknown = null

  // 3. Attempt each model in order; continue on retriable errors, stop on permanent ones
  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const model = candidateModels[attempt]
    const isLastModel = attempt === candidateModels.length - 1

    if (attempt > 0) {
      // ── Log fallback transition ──────────────────────────────────────────
      console.log(
        JSON.stringify({
          event: 'CLASSIFY_FALLBACK',
          fromModel: candidateModels[attempt - 1],
          toModel: model,
          attempt,
          ts: Date.now(),
        })
      )
    }

    try {
      const callStart = Date.now()

      // ── Log attempt start ────────────────────────────────────────────────
      console.log(
        JSON.stringify({
          event: 'GEMINI_CALL_START',
          model,
          attempt,
          sizeBytes: file.size,
          sdkTimeoutMs: SDK_TIMEOUT_MS,
          ts: callStart,
        })
      )

      // SDK-level HTTP timeout: actually aborts the underlying TCP connection
      // so silent hangs can never consume more than SDK_TIMEOUT_MS of budget.
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { timeout: SDK_TIMEOUT_MS },
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          console.log(
            JSON.stringify({
              event: 'GEMINI_TIMEOUT',
              model,
              attempt,
              elapsedMs: Date.now() - callStart,
              timeoutMs: TIMEOUT_MS,
              ts: Date.now(),
            })
          )
          reject(
            new ClassifierError('TIMEOUT', 'Classification request timed out.')
          )
        }, TIMEOUT_MS)
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
                description:
                  'Danh mục phân loại rác chuẩn trong hệ thống TrashWhere.',
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
            required: [
              'category',
              'confidence',
              'explanation',
              'disposalAction',
            ],
          },
          temperature: 0.2,
        },
      })

      const response = await Promise.race([apiCallPromise, timeoutPromise])
      const elapsedMs = Date.now() - callStart

      // ── Log success ──────────────────────────────────────────────────────
      console.log(
        JSON.stringify({
          event: 'GEMINI_CALL_SUCCESS',
          model,
          attempt,
          elapsedMs,
          ts: Date.now(),
        })
      )

      responseText = response.text ?? null
      if (responseText) break
    } catch (error: unknown) {
      lastError = error

      const retriable = isRetriableProviderError(error)
      const isTimeout =
        error instanceof ClassifierError && error.code === 'TIMEOUT'

      // Sanitize message: 200-char limit, never log key material
      const rawMsg = error instanceof Error ? error.message : String(error)
      const sanitizedMessage = rawMsg.slice(0, 200)

      // ── Log error ────────────────────────────────────────────────────────
      console.log(
        JSON.stringify({
          event: 'GEMINI_CALL_ERROR',
          model,
          attempt,
          errorName: error instanceof Error ? error.name : typeof error,
          retriable: retriable || isTimeout,
          sanitizedMessage,
          ts: Date.now(),
        })
      )

      // Retriable errors (503, 429, timeout): try next model if one is available
      if ((retriable || isTimeout) && !isLastModel) {
        continue
      }

      // Non-retriable ClassifierError (MISSING_API_KEY, INVALID_RESPONSE, etc.)
      if (error instanceof ClassifierError) {
        throw error
      }

      // SDK AbortError or explicit timeout string
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.toLowerCase().includes('timeout'))
      ) {
        throw new ClassifierError('TIMEOUT', 'Classification request timed out.')
      }

      // Any other provider error
      throw new ClassifierError(
        'PROVIDER_ERROR',
        `Gemini provider encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  if (!responseText && lastError) {
    const retriable = isRetriableProviderError(lastError)
    const isTimeout =
      lastError instanceof ClassifierError && lastError.code === 'TIMEOUT'
    if (retriable || isTimeout) {
      throw new ClassifierError(
        'PROVIDER_ERROR',
        'Gemini service is temporarily unavailable. All candidate models returned retriable errors. Please try again shortly.'
      )
    }
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
  return parseAndValidateClassificationOutput(responseText)
}
