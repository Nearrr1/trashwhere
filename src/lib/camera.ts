/**
 * Camera utilities for TrashWhere (Phase 7A).
 *
 * Provides browser capability detection, media stream acquisition/release,
 * canvas-based frame capture to JPEG, and localized user-friendly error formatting.
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
 * Captures a single frame from an HTMLVideoElement and exports it as a JPEG File.
 *
 * @param video HTMLVideoElement containing the active video stream
 * @param quality JPEG compression quality (0 to 1, default 0.9)
 * @returns Promise<File> with MIME type 'image/jpeg'
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.9
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

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Không thể chụp ảnh từ video feed.'))
          return
        }
        const file = new File([blob], `camera-scan-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        resolve(file)
      },
      'image/jpeg',
      quality
    )
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
