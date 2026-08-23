import { AlertTriangle } from 'lucide-react'
import type { ApiErrorCode } from '@/types/classification'

// ── Error message map ───────────────────────────────────────────────────

const ERROR_MESSAGES: Record<ApiErrorCode | 'NETWORK', string> = {
  AI_ERROR: 'Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.',
  VALIDATION_ERROR: 'Ảnh không hợp lệ. Thử chụp lại với ánh sáng tốt hơn.',
  UNKNOWN: 'Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.',
  NETWORK: 'Kết nối quá chậm. Kiểm tra mạng và thử lại.',
}

// ── Types ───────────────────────────────────────────────────────────────

export type ErrorCode = ApiErrorCode | 'NETWORK'

interface ErrorStateProps {
  /** Error code to determine which message to show */
  code?: ErrorCode
  /** Called when user taps "Thử lại" */
  onRetry: () => void
}

/**
 * ErrorState — full-screen error display.
 *
 * Spec (screen-spec §Screen 6):
 *  - Layout: flex column, centred, takes full available height
 *  - Icon: AlertTriangle 48px, 1px stroke, terra
 *  - Title: Playfair Display 700 22px ink
 *  - Body: Source Serif 4 400 15px ink-secondary, max 280px
 *  - CTA: primary button "Thử lại"
 *  - ARIA: role="alert" on the entire section
 *
 * Does not expose stack traces. Message is selected by error code.
 */
export default function ErrorState({
  code = 'UNKNOWN',
  onRetry,
}: ErrorStateProps) {
  const message = ERROR_MESSAGES[code]

  return (
    <div
      role="alert"
      className="flex flex-col items-center text-center"
      style={{ padding: '48px 20px' }}
    >
      <AlertTriangle
        size={48}
        strokeWidth={1}
        aria-hidden="true"
        style={{ color: 'var(--color-terra)', marginBottom: '20px' }}
      />

      <h1
        className="text-ink"
        style={{
          fontFamily: 'var(--font-serif-display)',
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '12px',
        }}
      >
        Không thể phân tích ảnh
      </h1>

      <p
        className="text-ink-secondary text-pretty"
        style={{
          fontFamily: 'var(--font-serif-body)',
          fontSize: '15px',
          maxWidth: '280px',
          marginBottom: '32px',
        }}
      >
        {message}
      </p>

      <button
        id="btn-retry"
        type="button"
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors"
        style={{
          height: '56px',
          fontFamily: 'var(--font-sans)',
          fontSize: '15px',
          fontWeight: 500,
          transitionDuration: 'var(--duration-fast)',
        }}
      >
        Thử lại
      </button>
    </div>
  )
}
