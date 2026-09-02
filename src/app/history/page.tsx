'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  LogIn,
  Trash2,
  Camera,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import BottomNav from '@/components/BottomNav'
import CategoryIcon from '@/components/CategoryIcon'
import { getCategoryMeta } from '@/lib/waste-categories'
import type { ScanDocument, HistoryStats } from '@/types/history'
import type { WasteCategory } from '@/types/classification'

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<ScanDocument[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const refetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/history')
      if (res.status === 401) {
        setIsAnonymous(true)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setIsAnonymous(false)
        setScans(data.scans || [])
        setStats(data.stats || null)
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến cơ sở dữ liệu lịch sử.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const res = await fetch('/api/history')
        if (!isMounted) return

        if (res.status === 401) {
          setIsAnonymous(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          throw new Error('Không thể tải lịch sử')
        }

        const data = await res.json()
        if (!isMounted) return

        setIsAnonymous(false)
        setScans(data.scans || [])
        setStats(data.stats || null)
      } catch (err: unknown) {
        if (!isMounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến cơ sở dữ liệu lịch sử.'
        )
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  async function handleDeleteScan(id?: string) {
    if (!id) return
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setScans(prev => prev.filter(s => s._id !== id))
        refetchHistory()
      }
    } catch (err) {
      console.warn('Failed to delete scan:', err)
    }
  }

  async function handleClearAll() {
    setIsClearing(true)
    try {
      const res = await fetch('/api/history', { method: 'DELETE' })
      if (res.ok) {
        setScans([])
        setShowClearConfirm(false)
        refetchHistory()
      }
    } catch (err) {
      console.warn('Failed to clear history:', err)
    } finally {
      setIsClearing(false)
    }
  }

  function formatScanDate(dateInput: string | Date): string {
    try {
      const d = new Date(dateInput)
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <AppShell>
      <PageHeader />

      <main
        className="flex-1 flex flex-col px-5 pt-4"
        style={{ paddingBottom: '96px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-forest" aria-hidden="true" />
            <h1
              className="text-ink font-bold text-xl"
              style={{ fontFamily: 'var(--font-serif-display)' }}
            >
              Lịch sử quét
            </h1>
          </div>

          {!isAnonymous && scans.length > 0 && (
            <button
              id="btn-clear-history"
              type="button"
              onClick={() => setShowClearConfirm(true)}
              aria-label="Xóa tất cả lịch sử"
              className="text-xs text-terra hover:underline flex items-center gap-1"
              style={{ fontFamily: 'var(--font-sans)', minHeight: '36px' }}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* ── Clear Confirmation Modal / Banner ─── */}
        {showClearConfirm && (
          <div
            role="dialog"
            aria-label="Xác nhận xóa lịch sử"
            className="mb-4 p-3.5 rounded-sm border"
            style={{
              backgroundColor: 'var(--color-cat-hazardous-tint)',
              borderColor: 'var(--color-terra)',
            }}
          >
            <p className="text-sm text-ink mb-3">
              Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center gap-2">
              <button
                id="btn-confirm-clear"
                type="button"
                disabled={isClearing}
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded text-xs font-medium text-paper bg-terra transition-opacity"
              >
                {isClearing ? 'Đang xóa...' : 'Xóa toàn bộ'}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded text-xs font-medium border border-paper-rule text-ink"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* ── Loading State ─── */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-24 rounded-sm bg-paper-card border border-paper-rule animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Anonymous User Prompt ─── */}
        {!loading && isAnonymous && (
          <div
            className="flex flex-col items-center text-center p-6 rounded-md border mt-2"
            style={{
              backgroundColor: 'var(--color-paper-card)',
              borderColor: 'var(--color-paper-rule)',
            }}
          >
            <Clock size={36} className="text-forest mb-3" aria-hidden="true" />
            <h2
              className="text-lg font-bold text-ink mb-1"
              style={{ fontFamily: 'var(--font-serif-display)' }}
            >
              Lưu lịch sử trên mọi thiết bị
            </h2>
            <p
              className="text-sm text-ink-secondary mb-5 max-w-[280px]"
              style={{ fontFamily: 'var(--font-serif-body)' }}
            >
              Đăng nhập với Google để lưu các lần phân loại rác và xem lại ở bất kỳ đâu.
            </p>

            <Link
              id="btn-history-login"
              href="/api/auth/signin/google"
              prefetch={false}
              className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-hover text-paper rounded-md transition-colors font-medium text-sm"
              style={{ height: '48px', fontFamily: 'var(--font-sans)' }}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Đăng nhập với Google</span>
            </Link>

            <Link
              href="/"
              className="mt-3 text-xs text-forest underline flex items-center gap-1"
              style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
            >
              <Camera size={13} aria-hidden="true" />
              <span>Quét không cần đăng nhập</span>
            </Link>
          </div>
        )}

        {/* ── Database/Network Error State ─── */}
        {!loading && !isAnonymous && error && (
          <div
            role="alert"
            className="p-4 rounded-md border text-center flex flex-col items-center gap-3"
            style={{
              backgroundColor: 'var(--color-cat-hazardous-tint)',
              borderColor: 'var(--color-terra)',
            }}
          >
            <AlertTriangle size={28} className="text-terra" aria-hidden="true" />
            <p className="text-sm text-ink">{error}</p>
            <button
              type="button"
              onClick={refetchHistory}
              className="px-4 py-2 text-xs font-medium rounded bg-forest text-paper flex items-center gap-1"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {/* ── Authenticated User Empty State ─── */}
        {!loading && !isAnonymous && !error && scans.length === 0 && (
          <div
            className="flex flex-col items-center text-center p-8 rounded-md border mt-4"
            style={{
              backgroundColor: 'var(--color-paper-card)',
              borderColor: 'var(--color-paper-rule)',
            }}
          >
            <Camera size={36} className="text-ink-muted mb-3" aria-hidden="true" />
            <h2
              className="text-lg font-bold text-ink mb-1"
              style={{ fontFamily: 'var(--font-serif-display)' }}
            >
              Chưa có lượt quét nào
            </h2>
            <p
              className="text-sm text-ink-secondary mb-5 max-w-[260px]"
              style={{ fontFamily: 'var(--font-serif-body)' }}
            >
              Hãy quét một vật phẩm rác đầu tiên để bắt đầu lưu vào lịch sử đám mây.
            </p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-md text-sm font-medium bg-forest text-paper hover:bg-forest-hover transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Quét ngay
            </Link>
          </div>
        )}

        {/* ── Authenticated User History List & Stats ─── */}
        {!loading && !isAnonymous && !error && scans.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Lightweight Statistics Banner (Feature 4) */}
            {stats && stats.totalScans > 0 && (
              <div
                className="p-3.5 rounded-md border"
                style={{
                  backgroundColor: 'var(--color-paper-card)',
                  borderColor: 'var(--color-paper-rule)',
                }}
              >
                <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
                  <span className="font-semibold text-ink">Thống kê của bạn</span>
                  <span>{stats.totalScans} lượt quét</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(stats.categoryCounts)
                    .filter(([, count]) => count > 0)
                    .map(([cat, count]) => {
                      const meta = getCategoryMeta(cat as WasteCategory)
                      return (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-paper)',
                            border: '1px solid var(--color-paper-rule)',
                          }}
                        >
                          {meta.label}: <strong>{count}</strong>
                        </span>
                      )
                    })}
                </div>
              </div>
            )}

            {/* List of Scan Cards */}
            <div className="flex flex-col gap-3">
              {scans.map(scan => {
                const meta = getCategoryMeta(scan.category)
                const pct = Math.round(scan.confidence * 100)

                return (
                  <div
                    key={scan._id}
                    className="p-3.5 rounded-sm border flex flex-col gap-2 relative transition-all"
                    style={{
                      backgroundColor: 'var(--color-paper-card)',
                      borderColor: 'var(--color-paper-rule)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={scan.category} size={22} className="shrink-0" />
                        <span
                          className="font-bold text-base text-ink"
                          style={{ fontFamily: 'var(--font-serif-display)' }}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--color-amber-light)',
                            color: 'var(--color-amber)',
                          }}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted">
                          {formatScanDate(scan.createdAt)}
                        </span>
                        <button
                          type="button"
                          id={`btn-delete-scan-${scan._id}`}
                          onClick={() => handleDeleteScan(scan._id)}
                          aria-label={`Xóa bản ghi ${meta.label}`}
                          className="text-ink-muted hover:text-terra p-1 transition-colors"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <p
                      className="text-xs text-ink-secondary line-clamp-2"
                      style={{ fontFamily: 'var(--font-serif-body)' }}
                    >
                      {scan.explanation}
                    </p>

                    {scan.feedback && (
                      <div className="flex items-center gap-1 text-xs text-forest mt-1">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        <span>
                          {scan.feedback.wasCorrect
                            ? 'Đã xác nhận chính xác'
                            : 'Đã gửi phản hồi đính chính'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </AppShell>
  )
}
