import { describe, it, expect } from 'vitest'
import {
  validateMagicBytes,
  ACCEPTED_MIME,
  MAX_FILE_SIZE_BYTES,
} from '@/app/api/classify/route'

describe('route validation & magic bytes', () => {
  it('defines valid MIME types and size limits', () => {
    expect(ACCEPTED_MIME.has('image/jpeg')).toBe(true)
    expect(ACCEPTED_MIME.has('image/png')).toBe(true)
    expect(ACCEPTED_MIME.has('image/webp')).toBe(true)
    expect(ACCEPTED_MIME.has('application/pdf')).toBe(false)
    expect(ACCEPTED_MIME.has('image/gif')).toBe(false)

    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })

  it('validates JPEG magic bytes (FF D8 FF)', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' })
    const isValid = await validateMagicBytes(file)
    expect(isValid).toBe(true)
  })

  it('validates PNG magic bytes (89 50 4E 47)', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const file = new File([pngBytes], 'test.png', { type: 'image/png' })
    const isValid = await validateMagicBytes(file)
    expect(isValid).toBe(true)
  })

  it('validates WebP magic bytes (RIFF + WEBP)', async () => {
    // RIFF (bytes 0-3), size (bytes 4-7), WEBP (bytes 8-11)
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8
    ])
    const file = new File([webpBytes], 'test.webp', { type: 'image/webp' })
    const isValid = await validateMagicBytes(file)
    expect(isValid).toBe(true)
  })

  it('rejects text files disguised as images', async () => {
    const fakeFile = new File(['<html><body>Not an image</body></html>'], 'fake.jpg', {
      type: 'image/jpeg',
    })
    const isValid = await validateMagicBytes(fakeFile)
    expect(isValid).toBe(false)
  })

  it('rejects corrupted short files (< 4 bytes)', async () => {
    const shortFile = new File([new Uint8Array([0xff, 0xd8])], 'short.jpg', {
      type: 'image/jpeg',
    })
    const isValid = await validateMagicBytes(shortFile)
    expect(isValid).toBe(false)
  })
})
