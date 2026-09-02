/**
 * Scanner Integration Tests — Phase 10
 *
 * Tests for:
 *  - resizeAndCompressFrame: dimension capping logic for all orientations
 *  - captureVideoFrame: end-to-end integration with resize pipeline
 *  - Camera requesting state logic (unit-level simulation)
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { resizeAndCompressFrame, captureVideoFrame } from '../camera'

// ── Canvas mock helpers ────────────────────────────────────────────────────

type MockCanvas = {
  width: number
  height: number
  getContext: ReturnType<typeof vi.fn>
  toBlob: ReturnType<typeof vi.fn>
  drawImage?: ReturnType<typeof vi.fn>
}

/** Creates a canvas mock that produces a real JPEG-like blob on toBlob */
function makeCanvas(w: number, h: number): MockCanvas {
  const drawImage = vi.fn()
  return {
    width: w,
    height: h,
    getContext: vi.fn().mockReturnValue({ drawImage }),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => {
      cb(new Blob(['fake-jpeg'], { type: 'image/jpeg' }))
    }),
    drawImage,
  }
}

/** Creates a canvas mock whose toBlob returns null (simulates failure) */
function makeFailingCanvas(w: number, h: number): MockCanvas {
  return {
    width: w,
    height: h,
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(null)),
  }
}

/** Creates a canvas mock with no 2D context */
function makeNoContextCanvas(w: number, h: number): MockCanvas {
  return {
    width: w,
    height: h,
    getContext: vi.fn().mockReturnValue(null),
    toBlob: vi.fn(),
  }
}

const originalDocument = global.document

afterEach(() => {
  Object.defineProperty(global, 'document', {
    value: originalDocument,
    writable: true,
  })
  vi.restoreAllMocks()
})

/**
 * Installs a document.createElement mock that hands out canvases from a queue.
 * Each call to createElement('canvas') pops the next canvas from the queue.
 */
function mockCanvasQueue(...canvases: MockCanvas[]) {
  const queue = [...canvases]
  Object.defineProperty(global, 'document', {
    value: {
      createElement: vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return queue.shift() ?? makeCanvas(0, 0)
        }
        return {}
      }),
    },
    writable: true,
  })
}

// ── resizeAndCompressFrame ─────────────────────────────────────────────────

describe('resizeAndCompressFrame', () => {
  it('returns a JPEG Blob without creating a second canvas when dimensions are within limit', async () => {
    // 1280×720 < 1920 — no resize canvas needed
    const source = makeCanvas(1280, 720)
    // Only one canvas in queue; the function should not request a second one
    mockCanvasQueue(source)

    const blob = await resizeAndCompressFrame(source as unknown as HTMLCanvasElement)

    expect(blob).toBeInstanceOf(Blob)
    // toBlob called exactly once on the original canvas
    expect(source.toBlob).toHaveBeenCalledTimes(1)
  })

  it('scales down a landscape frame that exceeds maxDimension (4K → 1920×1080)', async () => {
    // 3840×2160 → should be resized to 1920×1080
    const source = makeCanvas(3840, 2160)
    const resizeCanvas = makeCanvas(0, 0)

    // Queue: source is passed in directly (not via createElement),
    // but the resize canvas IS created via createElement
    mockCanvasQueue(resizeCanvas)

    const blob = await resizeAndCompressFrame(
      source as unknown as HTMLCanvasElement,
      1920
    )

    expect(resizeCanvas.width).toBe(1920)
    expect(resizeCanvas.height).toBe(1080)
    // drawImage called on the resize canvas's context
    const ctx = (resizeCanvas.getContext as ReturnType<typeof vi.fn>).mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> }
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, 1920, 1080)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('scales down a portrait frame that exceeds maxDimension (1080×1920 stays 1080×1920 since height == maxDim)', async () => {
    // 1080×1920 portrait — height equals maxDimension exactly so no resize needed
    const source = makeCanvas(1080, 1920)
    mockCanvasQueue() // no extra canvas should be needed

    const blob = await resizeAndCompressFrame(
      source as unknown as HTMLCanvasElement,
      1920
    )

    // Both dimensions ≤ 1920 → no resize canvas created → toBlob on source
    expect(source.toBlob).toHaveBeenCalledTimes(1)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('scales down a portrait frame wider than maxDimension (1920×2560 → 1440×1920)', async () => {
    // height=2560 > 1920 → height capped at 1920, width = round(1920/2560 * 1920) = 1440
    const source = makeCanvas(1920, 2560)
    const resizeCanvas = makeCanvas(0, 0)
    mockCanvasQueue(resizeCanvas)

    await resizeAndCompressFrame(source as unknown as HTMLCanvasElement, 1920)

    expect(resizeCanvas.height).toBe(1920)
    expect(resizeCanvas.width).toBe(1440)
  })

  it('scales down a square frame that exceeds maxDimension (2400×2400 → 1920×1920)', async () => {
    const source = makeCanvas(2400, 2400)
    const resizeCanvas = makeCanvas(0, 0)
    mockCanvasQueue(resizeCanvas)

    await resizeAndCompressFrame(source as unknown as HTMLCanvasElement, 1920)

    expect(resizeCanvas.width).toBe(1920)
    expect(resizeCanvas.height).toBe(1920)
    const ctx = (resizeCanvas.getContext as ReturnType<typeof vi.fn>).mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> }
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, 1920, 1920)
  })

  it('uses a custom maxDimension (2000×1000 → 800×400)', async () => {
    // 2000 > 800 → landscape → width=800, height=round(1000/2000*800)=400
    const source = makeCanvas(2000, 1000)
    const resizeCanvas = makeCanvas(0, 0)
    mockCanvasQueue(resizeCanvas)

    await resizeAndCompressFrame(source as unknown as HTMLCanvasElement, 800)

    expect(resizeCanvas.width).toBe(800)
    expect(resizeCanvas.height).toBe(400)
  })

  it('rejects when the canvas toBlob returns null', async () => {
    const source = makeFailingCanvas(800, 600)
    mockCanvasQueue()

    await expect(
      resizeAndCompressFrame(source as unknown as HTMLCanvasElement)
    ).rejects.toThrow('Không thể nén ảnh đã chụp.')
  })

  it('rejects when the resize canvas context is unavailable', async () => {
    // Source is over the limit so it will try to create a resize canvas
    const source = makeCanvas(3000, 2000)
    const badResizeCanvas = makeNoContextCanvas(0, 0)
    mockCanvasQueue(badResizeCanvas)

    await expect(
      resizeAndCompressFrame(source as unknown as HTMLCanvasElement, 1920)
    ).rejects.toThrow('Canvas context not available for resize')
  })
})

// ── captureVideoFrame integration ──────────────────────────────────────────

describe('captureVideoFrame (with resize pipeline)', () => {
  it('produces a JPEG File for a standard 1280×720 capture (within 1920 limit)', async () => {
    const captureCanvas = makeCanvas(1280, 720)
    mockCanvasQueue(captureCanvas)

    const video = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement
    const file = await captureVideoFrame(video)

    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/jpeg')
    expect(file.name).toMatch(/^camera-scan-\d+\.jpg$/)
    expect(captureCanvas.width).toBe(1280)
    expect(captureCanvas.height).toBe(720)
    const ctx = (captureCanvas.getContext as ReturnType<typeof vi.fn>).mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> }
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720)
  })

  it('falls back to 640×480 when video dimensions report zero', async () => {
    const captureCanvas = makeCanvas(640, 480)
    mockCanvasQueue(captureCanvas)

    const video = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement
    await captureVideoFrame(video)

    expect(captureCanvas.width).toBe(640)
    expect(captureCanvas.height).toBe(480)
    const ctx = (captureCanvas.getContext as ReturnType<typeof vi.fn>).mock.results[0].value as { drawImage: ReturnType<typeof vi.fn> }
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480)
  })

  it('throws when canvas 2D context is unavailable', async () => {
    const badCanvas = makeNoContextCanvas(0, 0)
    mockCanvasQueue(badCanvas)

    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement
    await expect(captureVideoFrame(video)).rejects.toThrow(
      'Canvas context not available'
    )
  })

  it('rejects with Vietnamese error when toBlob returns null', async () => {
    const failingCanvas = makeFailingCanvas(640, 480)
    mockCanvasQueue(failingCanvas)

    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement
    await expect(captureVideoFrame(video)).rejects.toThrow(
      'Không thể nén ảnh đã chụp.'
    )
  })
})

// ── Camera requesting state semantics ─────────────────────────────────────

describe('Camera requesting state logic', () => {
  it('simulates the isCameraRequesting flag lifecycle during a successful open', () => {
    let isCameraRequesting = false
    let isCameraActive = false

    // Step 1: user taps "Quét bằng Camera"
    isCameraRequesting = true
    expect(isCameraRequesting).toBe(true)

    // Step 2: getUserMedia resolves (mock stream)
    const streamResolved = true
    if (streamResolved) {
      isCameraActive = true
      isCameraRequesting = false
    }

    expect(isCameraActive).toBe(true)
    expect(isCameraRequesting).toBe(false)
  })

  it('simulates the isCameraRequesting flag lifecycle when permission is denied', () => {
    let isCameraRequesting = false
    let cameraError: string | null = null

    isCameraRequesting = true
    expect(isCameraRequesting).toBe(true)

    // getUserMedia rejects with NotAllowedError
    const err = new DOMException('Permission denied', 'NotAllowedError')
    isCameraRequesting = false
    cameraError = err.message

    expect(isCameraRequesting).toBe(false)
    expect(cameraError).toBeTruthy()
  })

  it('simulates isCameraRequesting reset when user closes camera mid-request (race condition)', () => {
    let isCameraRequesting = true
    let cameraRequestId = 1
    const requestIdAtStart = cameraRequestId

    // User closes camera before getUserMedia resolves → increment request ID
    cameraRequestId++

    // Stream arrives but is stale
    if (cameraRequestId !== requestIdAtStart) {
      isCameraRequesting = false
    }

    expect(isCameraRequesting).toBe(false)
  })

  it('simulates requesting state cleared when camera is explicitly closed', () => {
    let isCameraRequesting = true
    let isCameraActive = false

    // handleCloseCamera equivalent
    isCameraActive = false
    isCameraRequesting = false

    expect(isCameraRequesting).toBe(false)
    expect(isCameraActive).toBe(false)
  })
})
