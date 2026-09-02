/**
 * Camera utilities for TrashWhere (Phase 7A / Phase 10).
 *
 * Provides browser capability detection, media stream acquisition/release,
 * canvas-based frame capture to JPEG, client-side image resize/compression,
 * and localized user-friendly error formatting.
 */

export interface CameraSupportStatus {
  supported: boolean
  reason?: 'INSECURE_CONTEXT' | 'API_UNAVAILABLE'
}

/**
 * Checks whether the current runtime environment supports camera access.
 */
export function isCameraSupported(): CameraSupportStatus {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'API_UNAVAILABLE' }
  }

  if (window.isSecureContext === false) {
    return { supported: false, reason: 'INSECURE_CONTEXT' }
  }

  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function'
  ) {
    return { supported: false, reason: 'API_UNAVAILABLE' }
  }

  return { supported: true }
}

export type FacingMode = 'environment' | 'user'

/**
 * Requests video stream with preferred constraints.
 * Defaults to rear/environment camera for waste scanning.
 */
export async function startCameraStream(
  facingMode: FacingMode = 'environment',
  deviceId?: string
): Promise<MediaStream> {
  const check = isCameraSupported()
  if (!check.supported) {
    if (check.reason === 'INSECURE_CONTEXT') {
      const err = new Error('InsecureContext')
      err.name = 'InsecureContextError'
      throw err
    }
    const err = new Error('MediaDevicesUnavailable')
    err.name = 'NotSupportedError'
    throw err
  }

  const videoConstraints: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }

  return await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: false,
  })
}

/**
 * Cleanly stops all tracks in a MediaStream.
 */
export function stopCameraStream(
  stream: MediaStream | null | undefined
): void {
  if (!stream) return
  try {
    const tracks = stream.getTracks()
    for (const track of tracks) {
      track.stop()
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Scales a canvas proportionally so neither dimension exceeds `maxDimension`.
 * If both dimensions are already within the limit the canvas is returned unchanged.
 *
 * @param sourceCanvas - Canvas containing the raw captured frame
 * @param maxDimension - Maximum width or height in pixels (default 1920)
 * @param quality      - JPEG quality 0–1 (default 0.92)
 * @returns Promise<Blob> — JPEG-encoded image at the appropriate size
 */
export async function resizeAndCompressFrame(
  sourceCanvas: HTMLCanvasElement,
  maxDimension = 1920,
  quality = 0.92
): Promise<Blob> {
  const { width, height } = sourceCanvas

  let targetWidth = width
  let targetHeight = height

  // Scale down proportionally if necessary
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      targetWidth = maxDimension
      targetHeight = Math.round((height / width) * maxDimension)
    } else {
      targetHeight = maxDimension
      targetWidth = Math.round((width / height) * maxDimension)
    }
  }

  // If no resize needed, encode directly from the source canvas
  const outputCanvas =
    targetWidth === width && targetHeight === height
      ? sourceCanvas
      : (() => {
          const c = document.createElement('canvas')
          c.width = targetWidth
          c.height = targetHeight
          const ctx = c.getContext('2d')
          if (!ctx) throw new Error('Canvas context not available for resize')
          ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
          return c
        })()

  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Không thể nén ảnh đã chụp.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
}

/**
 * Captures a single frame from an HTMLVideoElement, applies proportional
 * resize if the resolution exceeds `maxDimension`, and exports a JPEG File.
 *
 * @param video        - HTMLVideoElement with an active video stream
 * @param quality      - JPEG compression quality (0–1, default 0.92)
 * @param maxDimension - Maximum width or height after resize (default 1920)
 * @returns Promise<File> with MIME type 'image/jpeg'
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.92,
  maxDimension = 1920
): Promise<File> {
  const width = video.videoWidth || 640
  const height = video.videoHeight || 480

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context not available')
  }

  ctx.drawImage(video, 0, 0, width, height)

  const blob = await resizeAndCompressFrame(canvas, maxDimension, quality)

  return new File([blob], `camera-scan-${Date.now()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

/**
 * Translates standard camera DOMExceptions into plain Vietnamese guidance for high-school students.
 */
export function formatCameraError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as { name?: string; message?: string }
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Không thể truy cập camera. Hãy cho phép trình duyệt sử dụng camera hoặc chọn "Tải ảnh lên" để tiếp tục.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Không tìm thấy camera trên thiết bị. Vui lòng tải ảnh lên từ thư viện.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera đang được sử dụng bởi ứng dụng khác hoặc không thể khởi động. Vui lòng thử lại hoặc tải ảnh lên.'
      case 'OverconstrainedError':
        return 'Không thể khởi động camera với cấu hình yêu cầu. Vui lòng thử lại.'
      case 'InsecureContextError':
        return 'Yêu cầu kết nối an toàn (HTTPS hoặc localhost) để sử dụng camera. Vui lòng tải ảnh lên.'
      case 'NotSupportedError':
        return 'Trình duyệt này không hỗ trợ chụp ảnh trực tiếp qua camera. Vui lòng chọn "Tải ảnh lên".'
    }
  }

  return 'Không thể mở camera. Vui lòng thử lại hoặc tải ảnh lên từ thư viện.'
}
