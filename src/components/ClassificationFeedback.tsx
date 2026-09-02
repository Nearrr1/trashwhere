'use client'

import { useState } from 'react'
import { Check, X, ThumbsUp } from 'lucide-react'
import type { WasteCategory } from '@/types/classification'
import type { ClassificationFeedback as FeedbackType } from '@/types/history'
import { WASTE_CATEGORIES } from '@/lib/waste-categories'

interface ClassificationFeedbackProps {
  /** Optional scan record ID if saved in cloud database */
  scanId?: string
  /** Callback fired when feedback is selected */
  onFeedbackSubmitted?: (feedback: FeedbackType) => void
}

export default function ClassificationFeedback({
  scanId,
  onFeedbackSubmitted,
}: ClassificationFeedbackProps) {
  const [status, setStatus] = useState<
    'idle' | 'choosing_category' | 'submitted'
  >('idle')
  const [feedbackRecord, setFeedbackRecord] = useState<FeedbackType | null>(null)

  async function submitFeedback(feedback: FeedbackType) {
    setFeedbackRecord(feedback)
    setStatus('submitted')
    onFeedbackSubmitted?.(feedback)

    // If persisted in cloud, attach feedback asynchronously
    if (scanId) {
      try {
        await fetch(`/api/history/${scanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedback),
        })
      } catch (err) {
        console.warn('Failed to persist feedback to cloud:', err)
      }
    }
  }

  function handleYes() {
    submitFeedback({ wasCorrect: true })
  }

  function handleNo() {
    setStatus('choosing_category')
  }

  function handleSelectCorrection(category: WasteCategory) {
    submitFeedback({ wasCorrect: false, correctedCategory: category })
  }

  return (
    <div
      role="region"
      aria-label="Phản hồi độ chính xác"
      className="mt-4 p-3.5 rounded-sm border"
      style={{
        backgroundColor: 'var(--color-paper-card)',
        borderColor: 'var(--color-paper-rule)',
      }}
    >
      {status === 'idle' && (
        <div className="flex flex-col gap-2">
          <p
            className="text-xs text-ink-secondary"
            style={{ fontFamily: 'var(--font-serif-body)' }}
          >
            Kết quả nhận diện có chính xác không?
          </p>
          <div className="flex items-center gap-2">
            <button
              id="btn-feedback-yes"
              type="button"
              onClick={handleYes}
              aria-label="Kết quả nhận diện đúng"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-paper)',
                color: 'var(--color-forest)',
                border: '1px solid var(--color-paper-rule)',
                height: '36px',
              }}
            >
              <Check size={14} strokeWidth={2} aria-hidden="true" />
              Chính xác
            </button>

            <button
              id="btn-feedback-no"
              type="button"
              onClick={handleNo}
              aria-label="Kết quả nhận diện chưa đúng"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-paper)',
                color: 'var(--color-terra)',
                border: '1px solid var(--color-paper-rule)',
                height: '36px',
              }}
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
              Chưa đúng
            </button>
          </div>
        </div>
      )}

      {status === 'choosing_category' && (
        <div className="flex flex-col gap-2">
          <p
            className="text-xs text-ink"
            style={{ fontFamily: 'var(--font-serif-body)', fontWeight: 500 }}
          >
            Theo bạn, đây là loại rác nào?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WASTE_CATEGORIES.filter(c => c.id !== 'unknown').map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCorrection(cat.id)}
                className="text-xs py-1 px-2.5 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--color-paper)',
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-paper-rule)',
                  minHeight: '32px',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'submitted' && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-xs text-forest"
        >
          <ThumbsUp size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {feedbackRecord?.wasCorrect
              ? 'Cảm ơn bạn! Đóng góp giúp ứng dụng ngày càng chính xác.'
              : 'Đã ghi nhận ý kiến của bạn để cải thiện mô hình nhận diện.'}
          </span>
        </div>
      )}
    </div>
  )
}
