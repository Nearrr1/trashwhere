'use client'

import { useState, useId } from 'react'
import { CheckSquare, Square, CheckCircle2 } from 'lucide-react'

interface DisposalChecklistProps {
  /** Optional explicit instruction steps */
  instructions?: string[]
  /** Fallback raw disposal action text to parse if instructions are not provided */
  disposalAction: string
}

/**
 * Parses raw text into discrete actionable steps if an explicit array is not provided.
 */
function extractSteps(actionText: string, providedInstructions?: string[]): string[] {
  if (providedInstructions && providedInstructions.length > 0) {
    return providedInstructions.filter(s => s.trim().length > 0)
  }

  // Attempt to split by numbered lists (e.g. 1., 2., 3.)
  const numbered = actionText
    .split(/(?:^|\n|\s)\d+[\.\)\-]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (numbered.length > 1) {
    return numbered
  }

  // Attempt to split by bullet points or newlines
  const bulleted = actionText
    .split(/[\n•\-\*]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (bulleted.length > 1) {
    return bulleted
  }

  // Fallback to splitting by period followed by capital letter/space
  const sentences = actionText
    .split(/\.\s+/)
    .map(s => s.trim().replace(/\.$/, ''))
    .filter(s => s.length > 10)

  if (sentences.length > 1) {
    return sentences
  }

  return [actionText.trim()]
}

/**
 * DisposalChecklist — Interactive checklist for waste disposal steps (Phase 13 §31).
 *
 * State is strictly local (never sent to database or analytics).
 * Resets whenever a new disposalAction is passed in.
 */
export default function DisposalChecklist({
  instructions,
  disposalAction,
}: DisposalChecklistProps) {
  const steps = extractSteps(disposalAction, instructions)
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set())
  const baseId = useId()

  function toggleStep(index: number) {
    setCheckedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const completedCount = checkedIndices.size
  const totalCount = steps.length
  const allCompleted = totalCount > 0 && completedCount === totalCount

  return (
    <div className="flex flex-col mt-3">
      {/* ── Progress indicator ─── */}
      <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          Các bước thực hiện
        </span>
        <span
          className="flex items-center gap-1 font-medium"
          style={{
            color: allCompleted ? 'var(--color-forest)' : 'var(--color-ink-muted)',
          }}
        >
          {allCompleted && (
            <CheckCircle2 size={13} className="inline text-forest" aria-hidden="true" />
          )}
          {completedCount} / {totalCount} hoàn thành
        </span>
      </div>

      {/* ── Checklist items ─── */}
      <div className="flex flex-col gap-2">
        {steps.map((step, idx) => {
          const isChecked = checkedIndices.has(idx)
          const itemId = `${baseId}-step-${idx}`

          return (
            <label
              key={idx}
              htmlFor={itemId}
              className="flex items-start gap-2.5 p-2.5 rounded-sm transition-colors cursor-pointer select-none"
              style={{
                backgroundColor: isChecked
                  ? 'var(--color-cat-recyclable-tint)'
                  : 'var(--color-paper-card)',
                border: '1px solid var(--color-paper-rule)',
              }}
            >
              {/* Native invisible checkbox for accessibility */}
              <input
                id={itemId}
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleStep(idx)}
                className="sr-only"
                aria-label={`Bước ${idx + 1}: ${step}`}
              />

              {/* Styled checkbox icon */}
              <div
                className="shrink-0 mt-0.5"
                style={{
                  color: isChecked
                    ? 'var(--color-forest)'
                    : 'var(--color-ink-muted)',
                }}
              >
                {isChecked ? (
                  <CheckSquare size={18} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Square size={18} strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>

              {/* Step text */}
              <span
                className="text-sm leading-snug flex-1"
                style={{
                  fontFamily: 'var(--font-serif-body)',
                  color: isChecked
                    ? 'var(--color-ink-muted)'
                    : 'var(--color-ink)',
                  textDecoration: isChecked ? 'line-through' : 'none',
                }}
              >
                {step}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
