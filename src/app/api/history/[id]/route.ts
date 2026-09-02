/**
 * Route Handler: /api/history/[id] (Phase 13)
 *
 * DELETE — Removes a single scan with verified user ownership.
 * PATCH  — Adds user feedback (wasCorrect, correctedCategory) to the scan.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteUserScan, recordUserScanFeedback } from '@/lib/history-service'
import type { WasteCategory } from '@/types/classification'

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'recyclable',
  'organic',
  'hazardous',
  'electronic',
  'general',
  'unknown',
])

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth()
  const userId = session?.user?.id || session?.user?.email

  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' },
      { status: 401 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json(
      { error: 'MISSING_ID', message: 'Thiếu mã bản ghi.' },
      { status: 400 }
    )
  }

  try {
    const deleted = await deleteUserScan(userId, id)
    if (!deleted) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Không tìm thấy bản ghi hoặc bạn không có quyền xóa.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (err) {
    console.error('Failed to delete scan:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Lỗi khi xóa bản ghi.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth()
  const userId = session?.user?.id || session?.user?.email

  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập.' },
      { status: 401 }
    )
  }

  const { id } = await context.params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Dữ liệu không hợp lệ.' },
      { status: 400 }
    )
  }

  const wasCorrect = Boolean(body.wasCorrect)
  let correctedCategory: WasteCategory | undefined

  if (!wasCorrect && typeof body.correctedCategory === 'string') {
    if (!VALID_CATEGORIES.has(body.correctedCategory)) {
      return NextResponse.json(
        { error: 'INVALID_CATEGORY', message: 'Danh mục chỉnh sửa không hợp lệ.' },
        { status: 400 }
      )
    }
    correctedCategory = body.correctedCategory as WasteCategory
  }

  try {
    const updated = await recordUserScanFeedback(userId, id, {
      wasCorrect,
      correctedCategory,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy bản ghi cần cập nhật.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to record feedback:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Lỗi khi lưu phản hồi.' },
      { status: 500 }
    )
  }
}
