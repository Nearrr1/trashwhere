import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isCameraSupported,
  formatCameraError,
  stopCameraStream,
  startCameraStream,
  captureVideoFrame,
} from '../camera'

describe('Camera Utilities', () => {
  const originalNavigator = global.navigator
  const originalWindow = global.window
  const originalDocument = global.document

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
    })
    Object.defineProperty(global, 'document', {
      value: originalDocument,
      writable: true,
    })
  })

  describe('isCameraSupported', () => {
    it('returns supported: false when navigator.mediaDevices is missing', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: { isSecureContext: true },
        writable: true,
      })

      const status = isCameraSupported()
      expect(status.supported).toBe(false)
      expect(status.reason).toBe('API_UNAVAILABLE')
    })

    it('returns supported: false when context is not secure', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: { isSecureContext: false },
        writable: true,
      })

      const status = isCameraSupported()
      expect(status.supported).toBe(false)
      expect(status.reason).toBe('INSECURE_CONTEXT')
    })

    it('returns supported: true when mediaDevices.getUserMedia exists in secure context', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: { isSecureContext: true },
        writable: true,
      })

      const status = isCameraSupported()
      expect(status.supported).toBe(true)
      expect(status.reason).toBeUndefined()
    })
  })

  describe('formatCameraError', () => {
    it('formats NotAllowedError with permission instruction', () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      const msg = formatCameraError(error)
      expect(msg).toContain('Không thể truy cập camera')
      expect(msg).toContain('Tải ảnh lên')
    })

    it('formats NotFoundError with device missing instruction', () => {
      const error = new DOMException('No camera', 'NotFoundError')
      const msg = formatCameraError(error)
      expect(msg).toContain('Không tìm thấy camera')
    })

    it('formats NotReadableError with camera busy instruction', () => {
      const error = new DOMException('Camera busy', 'NotReadableError')
      const msg = formatCameraError(error)
      expect(msg).toContain('đang được sử dụng bởi ứng dụng khác')
    })

    it('formats InsecureContextError with HTTPS instruction', () => {
      const error = { name: 'InsecureContextError', message: 'Insecure' }
      const msg = formatCameraError(error)
      expect(msg).toContain('kết nối an toàn (HTTPS hoặc localhost)')
    })

    it('returns default message for unknown errors', () => {
      const msg = formatCameraError(new Error('Unknown custom error'))
      expect(msg).toContain('Không thể mở camera')
    })
  })

  describe('stopCameraStream', () => {
    it('stops all tracks in the media stream', () => {
      const mockStop1 = vi.fn()
      const mockStop2 = vi.fn()

      const mockStream = {
        getTracks: vi.fn().mockReturnValue([
          { stop: mockStop1 },
          { stop: mockStop2 },
        ]),
      } as unknown as MediaStream

      stopCameraStream(mockStream)

      expect(mockStop1).toHaveBeenCalledTimes(1)
      expect(mockStop2).toHaveBeenCalledTimes(1)
    })

    it('handles null/undefined streams without throwing', () => {
      expect(() => stopCameraStream(null)).not.toThrow()
      expect(() => stopCameraStream(undefined)).not.toThrow()
    })
  })

  describe('startCameraStream', () => {
    it('requests media stream with facingMode: environment by default', async () => {
      const mockStream = { getTracks: () => [] }
      const getUserMediaMock = vi.fn().mockResolvedValue(mockStream)

      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: getUserMediaMock,
          },
        },
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: { isSecureContext: true },
        writable: true,
      })

      const stream = await startCameraStream()
      expect(stream).toBe(mockStream)
      expect(getUserMediaMock).toHaveBeenCalledWith({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
    })
  })

  describe('captureVideoFrame', () => {
    it('draws video frame to canvas and returns a JPEG File', async () => {
      const mockDrawImage = vi.fn()
      const mockToBlob = vi.fn((callback: (b: Blob | null) => void) => {
        const dummyBlob = new Blob(['dummy-jpeg-data'], { type: 'image/jpeg' })
        callback(dummyBlob)
      })

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: mockDrawImage,
        }),
        toBlob: mockToBlob,
      }

      Object.defineProperty(global, 'document', {
        value: {
          createElement: vi.fn().mockImplementation((tagName: string) => {
            if (tagName === 'canvas') return mockCanvas
            return {}
          }),
        },
        writable: true,
      })

      const mockVideo = {
        videoWidth: 1280,
        videoHeight: 720,
      } as unknown as HTMLVideoElement

      const file = await captureVideoFrame(mockVideo)

      expect(file).toBeInstanceOf(File)
      expect(file.type).toBe('image/jpeg')
      expect(file.name).toMatch(/^camera-scan-\d+\.jpg$/)
      expect(mockCanvas.width).toBe(1280)
      expect(mockCanvas.height).toBe(720)
      expect(mockDrawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 1280, 720)
    })
  })
})
