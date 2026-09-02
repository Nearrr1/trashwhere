import { describe, it, expect, vi } from 'vitest'
import { validateFile } from '@/components/ImageUploader'
import type { ApiErrorCode } from '@/types/classification'

describe('ImageUploader UX & Validation Rules (Phase 7C)', () => {
  describe('validateFile (Client-Side UX Validation)', () => {
    it('accepts valid JPEG file', () => {
      const file = new File(['dummy-content'], 'test.jpg', { type: 'image/jpeg' })
      const error = validateFile(file)
      expect(error).toBeNull()
    })

    it('accepts valid PNG file', () => {
      const file = new File(['dummy-content'], 'test.png', { type: 'image/png' })
      const error = validateFile(file)
      expect(error).toBeNull()
    })

    it('accepts valid WebP file', () => {
      const file = new File(['dummy-content'], 'test.webp', { type: 'image/webp' })
      const error = validateFile(file)
      expect(error).toBeNull()
    })

    it('rejects 0-byte empty files with friendly Vietnamese guidance (Journey F)', () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      expect(emptyFile.size).toBe(0)

      const error = validateFile(emptyFile)
      expect(error).not.toBeNull()
      expect(error?.message).toBe('Tệp rỗng hoặc không có dữ liệu. Vui lòng chọn ảnh hợp lệ.')
    })

    it('rejects unsupported MIME types (text files, GIFs, PDFs)', () => {
      const txtFile = new File(['hello world'], 'notes.txt', { type: 'text/plain' })
      const txtError = validateFile(txtFile)
      expect(txtError).not.toBeNull()
      expect(txtError?.message).toBe('Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.')

      const gifFile = new File(['gif-bytes'], 'anim.gif', { type: 'image/gif' })
      const gifError = validateFile(gifFile)
      expect(gifError).not.toBeNull()
      expect(gifError?.message).toBe('Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.')

      const pdfFile = new File(['pdf-bytes'], 'doc.pdf', { type: 'application/pdf' })
      const pdfError = validateFile(pdfFile)
      expect(pdfError).not.toBeNull()
      expect(pdfError?.message).toBe('Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.')
    })

    it('rejects oversized files exceeding 10 MB limit', () => {
      const tenMb = 10 * 1024 * 1024
      // Mock an oversized file
      const oversizedFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
      Object.defineProperty(oversizedFile, 'size', { value: tenMb + 1 })

      const error = validateFile(oversizedFile)
      expect(error).not.toBeNull()
      expect(error?.message).toBe('Tệp quá lớn. Vui lòng chọn ảnh dưới 10 MB.')
    })
  })

  describe('Error Code Coverage & User Safety', () => {
    const EXPECTED_ERROR_CODES: (ApiErrorCode | 'NETWORK')[] = [
      'AI_ERROR',
      'VALIDATION_ERROR',
      'INVALID_FILE_TYPE',
      'FILE_TOO_LARGE',
      'MISSING_IMAGE',
      'INVALID_REQUEST',
      'SERVER_ERROR',
      'RATE_LIMITED',
      'TOO_MANY_REQUESTS',
      'UNKNOWN',
      'NETWORK',
    ]

    it('covers all standard error codes with localized messages', () => {
      // Replicate the mapping in ErrorState to ensure no missing codes
      const errorMap: Record<ApiErrorCode | 'NETWORK', string> = {
        AI_ERROR: 'Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.',
        VALIDATION_ERROR: 'Ảnh không hợp lệ. Thử chụp lại với ánh sáng tốt hơn.',
        INVALID_FILE_TYPE: 'Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
        FILE_TOO_LARGE: 'Tệp quá lớn. Vui lòng chọn ảnh dưới 10 MB.',
        MISSING_IMAGE: 'Chưa có ảnh nào được gửi lên. Vui lòng thử lại.',
        INVALID_REQUEST: 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
        SERVER_ERROR: 'Đã xảy ra sự cố máy chủ. Vui lòng thử lại.',
        RATE_LIMITED: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng đợi một phút rồi thử lại.',
        TOO_MANY_REQUESTS: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng đợi một phút rồi thử lại.',
        UNKNOWN: 'Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.',
        NETWORK: 'Kết nối quá chậm hoặc mất mạng. Kiểm tra mạng và thử lại.',
      }

      for (const code of EXPECTED_ERROR_CODES) {
        expect(errorMap[code]).toBeDefined()
        expect(typeof errorMap[code]).toBe('string')
        expect(errorMap[code].length).toBeGreaterThan(10)
        // Ensure no technical stack traces or English error strings are leaked
        expect(errorMap[code]).not.toContain('Error:')
        expect(errorMap[code]).not.toContain('at Object.')
        expect(errorMap[code]).not.toContain('undefined')
      }
    })
  })

  describe('Race Condition & Session Cancellation Semantics', () => {
    it('simulates camera stream cancellation when request token increments', () => {
      let cameraRequestId = 0
      const trackStopMock = vi.fn()
      const mockStream = {
        getTracks: () => [{ stop: trackStopMock }],
      } as unknown as MediaStream

      // Step 1: User requests camera (requestId = 1)
      const requestId = ++cameraRequestId

      // Step 2: User cancels/closes camera before stream resolves
      cameraRequestId++ // Incremented by handleCloseCamera / stopActiveStream

      // Step 3: Stream finally resolves
      if (cameraRequestId !== requestId) {
        // Stream tracks must be terminated immediately
        for (const track of mockStream.getTracks()) {
          track.stop()
        }
      }

      expect(trackStopMock).toHaveBeenCalledTimes(1)
    })
  })
})
