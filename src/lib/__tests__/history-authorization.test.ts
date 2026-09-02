/**
 * Authorization Isolation & History Service Tests — Phase 13 (v2.3)
 *
 * Covers:
 *  - User A vs User B strict authorization isolation (no cross-user reads/writes/deletes)
 *  - Bounded history retention (max 50 scans per user)
 *  - Feedback persistence without mutating original AI classification
 *  - History statistics calculation
 *  - Database null/unavailable resilience
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectId, type Db } from 'mongodb'
import {
  saveUserScan,
  getUserHistory,
  deleteUserScan,
  clearUserHistory,
  recordUserScanFeedback,
  getUserHistoryStats,
  MAX_SCANS_PER_USER,
} from '../history-service'

// ── In-Memory MongoDB Mock ─────────────────────────────────────────────────

function createMockDb(): Db {
  const documents: Array<{
    _id: ObjectId
    userId: string
    category: string
    confidence: number
    explanation: string
    disposalAction: string
    recommendation?: unknown
    feedback?: unknown
    createdAt: Date
  }> = []

  const mockCollection = {
    createIndex: async () => 'userId_1_createdAt_-1',

    insertOne: async (doc: Record<string, unknown>) => {
      const _id = new ObjectId()
      const inserted = { _id, ...doc } as (typeof documents)[0]
      documents.push(inserted)
      return { insertedId: _id, acknowledged: true }
    },

    find: (filter: Record<string, unknown>, options?: { projection?: Record<string, number> }) => {
      const results = documents.filter(d => {
        if (filter.userId && d.userId !== filter.userId) return false
        if (filter._id && !d._id.equals(filter._id as ObjectId)) return false
        return true
      })

      return {
        sort: (sortObj: Record<string, number>) => {
          if (sortObj.createdAt === -1) {
            results.sort((a, b) => {
              const diff = b.createdAt.getTime() - a.createdAt.getTime()
              if (diff !== 0) return diff
              return b._id.toString().localeCompare(a._id.toString())
            })
          }
          return {
            skip: (skipCount: number) => ({
              limit: (limitCount: number) => ({
                toArray: async () => {
                  return results.slice(skipCount, skipCount + limitCount)
                },
              }),
              toArray: async () => results.slice(skipCount),
            }),
            toArray: async () => results,
          }
        },
        toArray: async () => {
          if (options?.projection?.category) {
            return results.map(r => ({ _id: r._id, category: r.category }))
          }
          return results
        },
      }
    },

    countDocuments: async (filter: Record<string, unknown>) => {
      return documents.filter(d => {
        if (filter.userId && d.userId !== filter.userId) return false
        return true
      }).length
    },

    deleteOne: async (filter: Record<string, unknown>) => {
      const idx = documents.findIndex(d => {
        if (filter.userId && d.userId !== filter.userId) return false
        if (filter._id && !d._id.equals(filter._id as ObjectId)) return false
        return true
      })
      if (idx !== -1) {
        documents.splice(idx, 1)
        return { deletedCount: 1, acknowledged: true }
      }
      return { deletedCount: 0, acknowledged: true }
    },

    deleteMany: async (filter: Record<string, unknown>) => {
      let count = 0
      for (let i = documents.length - 1; i >= 0; i--) {
        const d = documents[i]
        let matches = true
        if (filter.userId && d.userId !== filter.userId) matches = false
        if (filter._id && (filter._id as { $in?: ObjectId[] }).$in) {
          const ids = (filter._id as { $in: ObjectId[] }).$in
          if (!ids.some(id => id.equals(d._id))) matches = false
        }
        if (matches) {
          documents.splice(i, 1)
          count++
        }
      }
      return { deletedCount: count, acknowledged: true }
    },

    updateOne: async (
      filter: Record<string, unknown>,
      update: { $set?: Record<string, unknown> }
    ) => {
      const doc = documents.find(d => {
        if (filter.userId && d.userId !== filter.userId) return false
        if (filter._id && !d._id.equals(filter._id as ObjectId)) return false
        return true
      })
      if (doc && update.$set) {
        Object.assign(doc, update.$set)
        return { matchedCount: 1, modifiedCount: 1, acknowledged: true }
      }
      return { matchedCount: 0, modifiedCount: 0, acknowledged: true }
    },
  }

  return {
    collection: () => mockCollection,
  } as unknown as Db
}

// ── Test Suites ───────────────────────────────────────────────────────────

describe('Phase 13: History Service & Authorization Isolation Matrix', () => {
  let mockDb: Db

  beforeEach(() => {
    mockDb = createMockDb()
  })

  // ── Authorization Isolation Matrix ─────────────────────────────────────

  describe('User A vs User B Isolation Matrix (Mandatory §44 & §55)', () => {
    it('ensures User A can create and view only their own scans', async () => {
      const scanA1 = await saveUserScan(
        'user-A',
        {
          category: 'recyclable',
          confidence: 0.95,
          explanation: 'Chai nhựa tái chế',
          disposalAction: 'Bỏ vào thùng vàng',
        },
        mockDb
      )
      expect(scanA1).not.toBeNull()

      const historyA = await getUserHistory('user-A', 20, 1, mockDb)
      expect(historyA.total).toBe(1)
      expect(historyA.scans[0]._id).toBe(scanA1?._id)

      const historyB = await getUserHistory('user-B', 20, 1, mockDb)
      expect(historyB.total).toBe(0)
      expect(historyB.scans).toHaveLength(0)
    })

    it('prevents User B from reading User A scans', async () => {
      await saveUserScan(
        'user-A',
        {
          category: 'hazardous',
          confidence: 0.9,
          explanation: 'Pin hỏng',
          disposalAction: 'Điểm thu hồi',
        },
        mockDb
      )

      await saveUserScan(
        'user-B',
        {
          category: 'organic',
          confidence: 0.88,
          explanation: 'Vỏ chuối',
          disposalAction: 'Ủ phân hữu cơ',
        },
        mockDb
      )

      const historyA = await getUserHistory('user-A', 20, 1, mockDb)
      const historyB = await getUserHistory('user-B', 20, 1, mockDb)

      expect(historyA.total).toBe(1)
      expect(historyA.scans[0].category).toBe('hazardous')

      expect(historyB.total).toBe(1)
      expect(historyB.scans[0].category).toBe('organic')
    })

    it('prevents User B from deleting User A scans', async () => {
      const scanA = await saveUserScan(
        'user-A',
        {
          category: 'electronic',
          confidence: 0.92,
          explanation: 'Bo mạch cũ',
          disposalAction: 'Điểm rác điện tử',
        },
        mockDb
      )
      expect(scanA?._id).toBeDefined()

      // User B attempts to delete User A's scan ID
      const deleteResult = await deleteUserScan('user-B', scanA!._id!, mockDb)
      expect(deleteResult).toBe(false)

      // User A's scan still exists
      const historyA = await getUserHistory('user-A', 20, 1, mockDb)
      expect(historyA.total).toBe(1)
    })

    it('allows User A to delete their own scan', async () => {
      const scanA = await saveUserScan(
        'user-A',
        {
          category: 'general',
          confidence: 0.75,
          explanation: 'Bao bì nhiều lớp',
          disposalAction: 'Thùng rác thường',
        },
        mockDb
      )

      const deleteResult = await deleteUserScan('user-A', scanA!._id!, mockDb)
      expect(deleteResult).toBe(true)

      const historyA = await getUserHistory('user-A', 20, 1, mockDb)
      expect(historyA.total).toBe(0)
    })

    it('ensures clearing history for User A leaves User B history untouched', async () => {
      await saveUserScan(
        'user-A',
        {
          category: 'recyclable',
          confidence: 0.9,
          explanation: 'Bìa carton',
          disposalAction: 'Gấp gọn',
        },
        mockDb
      )

      const scanB = await saveUserScan(
        'user-B',
        {
          category: 'organic',
          confidence: 0.85,
          explanation: 'Rau thừa',
          disposalAction: 'Ủ hữu cơ',
        },
        mockDb
      )

      const deletedCount = await clearUserHistory('user-A', mockDb)
      expect(deletedCount).toBe(1)

      const historyA = await getUserHistory('user-A', 20, 1, mockDb)
      expect(historyA.total).toBe(0)

      const historyB = await getUserHistory('user-B', 20, 1, mockDb)
      expect(historyB.total).toBe(1)
      expect(historyB.scans[0]._id).toBe(scanB?._id)
    })
  })

  // ── Bounded Retention Policy ───────────────────────────────────────────

  describe('Bounded Retention Policy (MAX_SCANS_PER_USER = 50)', () => {
    it('prunes the oldest records when user exceeds 50 scans', async () => {
      // Save 52 scans
      for (let i = 1; i <= 52; i++) {
        await saveUserScan(
          'user-retention',
          {
            category: 'recyclable',
            confidence: 0.9,
            explanation: `Scan item ${i}`,
            disposalAction: 'Action',
          },
          mockDb
        )
      }

      const history = await getUserHistory('user-retention', 100, 1, mockDb)
      expect(history.total).toBe(MAX_SCANS_PER_USER)
      expect(history.scans).toHaveLength(MAX_SCANS_PER_USER)
      // Newest item should be item 52
      expect(history.scans[0].explanation).toBe('Scan item 52')
    })
  })

  // ── Classification Feedback Persistence ────────────────────────────────

  describe('Classification Feedback Non-Mutation', () => {
    it('records feedback without modifying original category or confidence', async () => {
      const scan = await saveUserScan(
        'user-feedback',
        {
          category: 'recyclable',
          confidence: 0.82,
          explanation: 'Hộp giấy',
          disposalAction: 'Thùng vàng',
        },
        mockDb
      )

      const feedbackUpdated = await recordUserScanFeedback(
        'user-feedback',
        scan!._id!,
        {
          wasCorrect: false,
          correctedCategory: 'general',
        },
        mockDb
      )

      expect(feedbackUpdated).toBe(true)

      const history = await getUserHistory('user-feedback', 20, 1, mockDb)
      const updatedScan = history.scans[0]

      // Original AI category and confidence remain intact
      expect(updatedScan.category).toBe('recyclable')
      expect(updatedScan.confidence).toBe(0.82)

      // Feedback attached separately
      expect(updatedScan.feedback).toBeDefined()
      expect(updatedScan.feedback?.wasCorrect).toBe(false)
      expect(updatedScan.feedback?.correctedCategory).toBe('general')
    })
  })

  // ── User Statistics ────────────────────────────────────────────────────

  describe('User Scan Statistics Calculation', () => {
    it('aggregates total counts and category breakdown', async () => {
      await saveUserScan(
        'user-stats',
        { category: 'recyclable', confidence: 0.9, explanation: '', disposalAction: '' },
        mockDb
      )
      await saveUserScan(
        'user-stats',
        { category: 'recyclable', confidence: 0.95, explanation: '', disposalAction: '' },
        mockDb
      )
      await saveUserScan(
        'user-stats',
        { category: 'organic', confidence: 0.8, explanation: '', disposalAction: '' },
        mockDb
      )

      const stats = await getUserHistoryStats('user-stats', mockDb)
      expect(stats.totalScans).toBe(3)
      expect(stats.categoryCounts.recyclable).toBe(2)
      expect(stats.categoryCounts.organic).toBe(1)
      expect(stats.categoryCounts.hazardous).toBe(0)
      expect(stats.mostCommonCategory).toBe('recyclable')
    })
  })

  // ── Database Unavailable Handling ──────────────────────────────────────

  describe('Database Failure Resilience', () => {
    it('gracefully handles null database without throwing', async () => {
      const nullDb = undefined // Will default to getDatabase() which returns null without MONGODB_URI
      const history = await getUserHistory('any-user', 20, 1, nullDb)
      expect(history.scans).toEqual([])
      expect(history.total).toBe(0)

      const saveResult = await saveUserScan(
        'any-user',
        { category: 'recyclable', confidence: 0.9, explanation: '', disposalAction: '' },
        nullDb
      )
      expect(saveResult).toBeNull()

      const deleteResult = await deleteUserScan('any-user', 'some-id', nullDb)
      expect(deleteResult).toBe(false)

      const clearResult = await clearUserHistory('any-user', nullDb)
      expect(clearResult).toBe(0)
    })
  })
})
