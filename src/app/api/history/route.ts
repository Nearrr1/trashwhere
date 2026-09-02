/**
 * Route Handler: /api/history (Phase 13)
 *
 * GET    — Retrieves the authenticated user's scan history and statistics.
 * POST   — Persists a new classification metadata record.
 * DELETE — Clears the authenticated user's entire history.
 *
 * Mandatory authorization isolation: all operations strictly scoped to session.user.id.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getUserHistory,
  saveUserScan,
  clearUserHistory,
  getUserHistoryStats,
} from '@/lib/history-service'
import type { WasteCategory } from '@/types/classification'

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'recyclable',
  'organic',
  'hazardous',
  'electronic',
  'general',
  'unknown',
])

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  const userId = session?.user?.id || session?.user?.email

  if (!userId) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập với tài khoản Google để xem lịch sử quét.',
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const page = parseInt(searchParams.get('page') || '1', 10)

  try {
    const historyData = await getUserHistory(userId, limit, page)
    const stats = await getUserHistoryStats(userId)

    return NextResponse.json({
      scans: historyData.scans,
      total: historyData.total,
      stats,
    })
  } catch (err) {
    console.error('Failed to query user history:', err)
    return NextResponse.json(
      {
        error: 'DATABASE_ERROR',
        message: 'Không thể tải lịch sử lúc này. Vui lòng thử lại sau.',
      },
      { status: 503 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  const userId = session?.user?.id || session?.user?.email

  if (!userId) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để lưu kết quả quét.',
      },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Dữ liệu không hợp lệ.' },
      { status: 400 }
    )
  }

  // Validate category
  if (
    typeof body.category !== 'string' ||
    !VALID_CATEGORIES.has(body.category)
  ) {
    return NextResponse.json(
      { error: 'INVALID_CATEGORY', message: 'Danh mục rác không hợp lệ.' },
      { status: 400 }
    )
  }

  const confidence = Number(body.confidence)
  if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    return NextResponse.json(
      { error: 'INVALID_CONFIDENCE', message: 'Điểm tự tin không hợp lệ.' },
      { status: 400 }
    )
  }

  const explanation =
    typeof body.explanation === 'string' ? body.explanation : ''
  const disposalAction =
    typeof body.disposalAction === 'string' ? body.disposalAction : ''

  const recommendation =
    typeof body.recommendation === 'object' && body.recommendation !== null
      ? (body.recommendation as {
          action: string
          instructions?: string[]
          reason?: string
        })
      : undefined

  try {
    const saved = await saveUserScan(userId, {
      category: body.category as WasteCategory,
      confidence,
      explanation,
      disposalAction,
      recommendation,
    })

    if (!saved) {
      return NextResponse.json(
        {
          error: 'DATABASE_UNAVAILABLE',
          message: 'Cơ sở dữ liệu đám mây chưa khả dụng.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true, scan: saved }, { status: 201 })
  } catch (err) {
    console.error('Failed to save scan:', err)
    return NextResponse.json(
      {
        error: 'SAVE_FAILED',
        message: 'Không thể lưu kết quả quét lúc này.',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(): Promise<NextResponse> {
  const session = await auth()
  const userId = session?.user?.id || session?.user?.email

  if (!userId) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để xóa lịch sử.',
      },
      { status: 401 }
    )
  }

  try {
    const deletedCount = await clearUserHistory(userId)
    return NextResponse.json({ success: true, deletedCount })
  } catch (err) {
    console.error('Failed to clear user history:', err)
    return NextResponse.json(
      {
        error: 'DELETE_FAILED',
        message: 'Không thể xóa lịch sử lúc này.',
      },
      { status: 500 }
    )
  }
}
