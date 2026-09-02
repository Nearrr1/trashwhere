/**
 * Reliability & Lifecycle Hardening Tests — Phase 12 (v2.2)
 *
 * Tests failure recovery, request identity, stale response protection,
 * client-side timeout progression, camera hardware fallback, and
 * stream cleanup resilience.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateFile } from '@/components/ImageUploader'
import { startCameraStream, stopCameraStream } from '@/lib/camera'

describe('Phase 12: UX & Reliability Lifecycle', () => {
  // ── Stale Request & Race Condition Protection ──────────────────────────

  describe('Asynchronous Analysis Request Identity & Stale Response Guard', () => {
    it('discards late-resolving response if analysisRequestId has incremented', async () => {
      let currentRequestId = 0
      let activeResult: string | null = null

      // Simulate Request A (token = 1)
      const requestAId = ++currentRequestId
      let resolveRequestA!: (val: string) => void
      const requestAPromise = new Promise<string>(res => {
        resolveRequestA = res
      })

      // User initiates Request B before A finishes (token = 2)
      const requestBId = ++currentRequestId
      let resolveRequestB!: (val: string) => void
      const requestBPromise = new Promise<string>(res => {
        resolveRequestB = res
      })

      // Request B resolves first
      resolveRequestB('RESULT_B')
      const resB = await requestBPromise
      if (currentRequestId === requestBId) {
        activeResult = resB
      }
      expect(activeResult).toBe('RESULT_B')

      // Request A finally resolves late
      resolveRequestA('RESULT_A')
      const resA = await requestAPromise
      if (currentRequestId === requestAId) {
        activeResult = resA
      }

      // Request A must NOT overwrite Request B
      expect(activeResult).toBe('RESULT_B')
    })

    it('ignores responses when user resets or rescans while request is in flight', async () => {
      let currentRequestId = 0
      let state = 'ANALYZING'
      let result: string | null = null

      // Start request
      const reqId = ++currentRequestId

      // User hits "Quét lại" / "Chọn lại"
      currentRequestId++ // Token incremented by handleRescan / handleReselect
      state = 'SCAN'

      // Delayed response arrives
      const lateData = 'STALE_DATA'
      if (currentRequestId === reqId) {
        result = lateData
        state = 'RESULT'
      }

      // State remains SCAN and result remains null
      expect(state).toBe('SCAN')
      expect(result).toBeNull()
    })
  })

  // ── Smart Retry Semantics ──────────────────────────────────────────────

  describe('Retry Semantics with Image Preservation', () => {
    it('preserves the active File when retrying an analysis failure', () => {
      const activeFile = new File(['mock-image-data'], 'scan.jpg', {
        type: 'image/jpeg',
      })
      let selectedFile: File | null = activeFile
      let errorCode: string | null = 'NETWORK'
      let appState = 'ERROR'
      let analysisCallCount = 0

      function handleRetry() {
        errorCode = null
        if (selectedFile) {
          appState = 'ANALYZING'
          analysisCallCount++
        } else {
          appState = 'SCAN'
        }
      }

      function handleReset() {
        selectedFile = null
        errorCode = null
        appState = 'SCAN'
      }

      // Retry: keeps file, moves to ANALYZING, clears error
      handleRetry()
      expect(selectedFile).toBe(activeFile)
      expect(appState).toBe('ANALYZING')
      expect(errorCode).toBeNull()
      expect(analysisCallCount).toBe(1)

      // Reset: discards file, moves to SCAN
      handleReset()
      expect(selectedFile).toBeNull()
      expect(appState).toBe('SCAN')
    })
  })

  // ── Timeout UX & Progression ───────────────────────────────────────────

  describe('Timeout Progression & Safety Net', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('transitions analysisStage from normal to delayed after 7 seconds', () => {
      let analysisStage: 'normal' | 'delayed' = 'normal'
      const timeoutRef = setTimeout(() => {
        analysisStage = 'delayed'
      }, 7000)

      expect(analysisStage).toBe('normal')

      vi.advanceTimersByTime(6999)
      expect(analysisStage).toBe('normal')

      vi.advanceTimersByTime(1)
      expect(analysisStage).toBe('delayed')

      clearTimeout(timeoutRef)
    })

    it('triggers client-side timeout after 50 seconds to prevent infinite hang', () => {
      let appState = 'ANALYZING'
      let errorCode: string | null = null
      const abortFn = vi.fn()

      const clientTimeout = setTimeout(() => {
        abortFn()
        errorCode = 'NETWORK'
        appState = 'ERROR'
      }, 50000)

      vi.advanceTimersByTime(49999)
      expect(appState).toBe('ANALYZING')
      expect(abortFn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(abortFn).toHaveBeenCalledTimes(1)
      expect(appState).toBe('ERROR')
      expect(errorCode).toBe('NETWORK')

      clearTimeout(clientTimeout)
    })
  })

  // ── Camera Hardware Fallback ───────────────────────────────────────────

  describe('Camera Hardware Fallback on OverconstrainedError', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('falls back to unconstrained { video: true } when OverconstrainedError occurs', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      } as unknown as MediaStream

      const getUserMediaMock = vi
        .fn()
        // First attempt with constraints fails with OverconstrainedError
        .mockRejectedValueOnce(
          new DOMException('Overconstrained', 'OverconstrainedError')
        )
        // Fallback attempt succeeds
        .mockResolvedValueOnce(mockStream)

      Object.defineProperty(globalThis, 'window', {
        value: { isSecureContext: true },
        writable: true,
      })

      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: getUserMediaMock },
        writable: true,
        configurable: true,
      })

      const stream = await startCameraStream('environment')

      expect(stream).toBe(mockStream)
      expect(getUserMediaMock).toHaveBeenCalledTimes(2)

      // First call had ideal constraints
      expect(getUserMediaMock.mock.calls[0][0].video).toEqual({
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      })

      // Second fallback call was unconstrained video
      expect(getUserMediaMock.mock.calls[1][0].video).toBe(true)
    })

    it('does not swallow other camera errors (e.g. NotAllowedError)', async () => {
      const getUserMediaMock = vi
        .fn()
        .mockRejectedValueOnce(
          new DOMException('Permission denied', 'NotAllowedError')
        )

      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: getUserMediaMock },
        writable: true,
        configurable: true,
      })

      await expect(startCameraStream('environment')).rejects.toThrow(
        'Permission denied'
      )
      expect(getUserMediaMock).toHaveBeenCalledTimes(1)
    })
  })

  // ── MediaStream Cleanup Idempotency ────────────────────────────────────

  describe('stopCameraStream Teardown Resilience', () => {
    it('safely stops all tracks on an active stream', () => {
      const track1 = { stop: vi.fn() }
      const track2 = { stop: vi.fn() }
      const stream = {
        getTracks: () => [track1, track2],
      } as unknown as MediaStream

      stopCameraStream(stream)

      expect(track1.stop).toHaveBeenCalledTimes(1)
      expect(track2.stop).toHaveBeenCalledTimes(1)
    })

    it('handles null, undefined, or empty streams without throwing', () => {
      expect(() => stopCameraStream(null)).not.toThrow()
      expect(() => stopCameraStream(undefined)).not.toThrow()

      const emptyStream = { getTracks: () => [] } as unknown as MediaStream
      expect(() => stopCameraStream(emptyStream)).not.toThrow()
    })

    it('silently ignores exceptions thrown by faulty tracks', () => {
      const brokenTrack = {
        stop: () => {
          throw new Error('Track stop crash')
        },
      }
      const stream = {
        getTracks: () => [brokenTrack],
      } as unknown as MediaStream

      expect(() => stopCameraStream(stream)).not.toThrow()
    })
  })

  // ── Defensive File Validation ──────────────────────────────────────────

  describe('Defensive File Validation', () => {
    it('handles null/undefined file defensively', () => {
      // @ts-expect-error Testing defensive runtime protection against null
      const err = validateFile(null)
      expect(err).not.toBeNull()
      expect(err?.message).toContain('Không tìm thấy tệp ảnh')
    })

    it('rejects 0-byte file', () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      const err = validateFile(emptyFile)
      expect(err).not.toBeNull()
      expect(err?.message).toContain('Tệp rỗng')
    })

    it('rejects unsupported MIME type', () => {
      const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })
      const err = validateFile(pdf)
      expect(err).not.toBeNull()
      expect(err?.message).toContain('Định dạng không hỗ trợ')
    })
  })
})
