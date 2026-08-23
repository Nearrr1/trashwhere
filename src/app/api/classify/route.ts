import { NextResponse } from 'next/server'
import { classifyImage, ClassifierError } from '@/lib/classifier'
import type { ApiError, ClassificationResult } from '@/types/classification'

/** Allowed MIME types for uploaded waste images */
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** 10 MB maximum file size limit */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Validates the file header magic bytes to ensure file contents
 * match the declared image format (JPEG, PNG, WebP).
 */
async function validateMagicBytes(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 12)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    if (bytes.length < 4) return false

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return true
    }

    // PNG: 89 50 4E 47
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return true
    }

    // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * POST /api/classify
 *
 * Receives multipart/form-data with an "image" field.
 * Authoritatively validates file existence, size, MIME type, and magic bytes.
 * Passes the image to the classifier abstraction and returns the ClassificationResult.
 */
export async function POST(
  request: Request
): Promise<NextResponse<ClassificationResult | ApiError>> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json<ApiError>(
      {
        error: 'INVALID_REQUEST',
        message:
          'Dữ liệu yêu cầu không hợp lệ. Vui lòng gửi dưới dạng multipart/form-data.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  const imageEntry = formData.get('image')

  if (
    !imageEntry ||
    typeof imageEntry === 'string' ||
    !(imageEntry instanceof File) ||
    imageEntry.size === 0
  ) {
    return NextResponse.json<ApiError>(
      {
        error: 'MISSING_IMAGE',
        message: 'Không tìm thấy tệp ảnh hợp lệ trong yêu cầu.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // 1. File size check
  if (imageEntry.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json<ApiError>(
      {
        error: 'FILE_TOO_LARGE',
        message: 'Kích thước tệp quá lớn. Vui lòng gửi ảnh dưới 10 MB.',
        code: 'VALIDATION_ERROR',
      },
      { status: 413 }
    )
  }

  // 2. MIME type check
  if (!ACCEPTED_MIME.has(imageEntry.type)) {
    return NextResponse.json<ApiError>(
      {
        error: 'INVALID_FILE_TYPE',
        message:
          'Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // 3. Magic bytes check
  const isMagicValid = await validateMagicBytes(imageEntry)
  if (!isMagicValid) {
    return NextResponse.json<ApiError>(
      {
        error: 'INVALID_FILE_TYPE',
        message:
          'Nội dung tệp không hợp lệ hoặc bị hỏng. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // 4. Server-side classifier execution
  try {
    const result = await classifyImage(imageEntry)
    return NextResponse.json<ClassificationResult>(result, { status: 200 })
  } catch (error: unknown) {
    if (error instanceof ClassifierError) {
      if (error.code === 'TIMEOUT') {
        return NextResponse.json<ApiError>(
          {
            error: 'AI_ERROR',
            message: 'Hệ thống AI phản hồi quá lâu. Vui lòng thử lại sau.',
            code: 'AI_ERROR',
          },
          { status: 504 }
        )
      }

      if (error.code === 'MISSING_API_KEY') {
        return NextResponse.json<ApiError>(
          {
            error: 'SERVER_ERROR',
            message: 'Dịch vụ AI chưa sẵn sàng hoặc gặp sự cố cấu hình.',
            code: 'SERVER_ERROR',
          },
          { status: 500 }
        )
      }

      return NextResponse.json<ApiError>(
        {
          error: 'AI_ERROR',
          message: 'Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.',
          code: 'AI_ERROR',
        },
        { status: 502 }
      )
    }

    return NextResponse.json<ApiError>(
      {
        error: 'SERVER_ERROR',
        message: 'Đã xảy ra sự cố trong quá trình phân tích ảnh.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    )
  }
}

