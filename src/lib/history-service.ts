/**
 * History Service — Isolated database access layer with strict server-side
 * authorization enforcement (Phase 13 §16).
 *
 * All operations are strictly scoped to the authenticated `userId`.
 * Users can never view, mutate, or delete another user's scan records.
 */

import { ObjectId, type Db } from 'mongodb'
import { getDatabase } from './mongodb'
import type {
  ScanDocument,
  ClassificationFeedback,
  HistoryStats,
} from '@/types/history'
import type { WasteCategory } from '@/types/classification'

export const MAX_SCANS_PER_USER = 50
const COLLECTION_NAME = 'scans'

let indexEnsured = false

/**
 * Ensures the compound index { userId: 1, createdAt: -1 } exists on the scans collection.
 */
export async function ensureHistoryIndexes(db: Db): Promise<void> {
  if (indexEnsured) return
  try {
    await db
      .collection(COLLECTION_NAME)
      .createIndex({ userId: 1, createdAt: -1 }, { background: true })
    indexEnsured = true
  } catch (err) {
    console.warn('Failed to ensure scans index:', err)
  }
}

/**
 * Persists a new scan classification for the authenticated user.
 * Enforces bounded growth by pruning oldest scans if count exceeds MAX_SCANS_PER_USER.
 *
 * @param userId - Authenticated user identity from server session
 * @param data   - Validated classification metadata
 * @param customDb - Optional Db instance for testing/dependency injection
 */
export async function saveUserScan(
  userId: string,
  data: {
    category: WasteCategory
    confidence: number
    explanation: string
    disposalAction: string
    recommendation?: {
      action: string
      instructions?: string[]
      reason?: string
    }
  },
  customDb?: Db
): Promise<ScanDocument | null> {
  const db = customDb || (await getDatabase())
  if (!db) return null

  await ensureHistoryIndexes(db)
  const collection = db.collection(COLLECTION_NAME)

  const doc = {
    userId,
    category: data.category,
    confidence: Math.max(0, Math.min(1, data.confidence)),
    explanation: data.explanation,
    disposalAction: data.disposalAction,
    recommendation: data.recommendation,
    createdAt: new Date(),
  }

  const insertResult = await collection.insertOne(doc)

  // Enforce bounded retention policy (MAX_SCANS_PER_USER)
  try {
    const totalForUser = await collection.countDocuments({ userId })
    if (totalForUser > MAX_SCANS_PER_USER) {
      const excessDocs = await collection
        .find({ userId }, { projection: { _id: 1 } })
        .sort({ createdAt: -1, _id: -1 })
        .skip(MAX_SCANS_PER_USER)
        .toArray()

      if (excessDocs.length > 0) {
        const idsToRemove = excessDocs.map(d => d._id)
        await collection.deleteMany({ _id: { $in: idsToRemove } })
      }
    }
  } catch (err) {
    console.warn('Failed to enforce scan retention bounds:', err)
  }

  return {
    _id: insertResult.insertedId.toString(),
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }
}

/**
 * Retrieves the authenticated user's scan history sorted newest-first.
 * Never returns records belonging to other users.
 */
export async function getUserHistory(
  userId: string,
  limit = 20,
  page = 1,
  customDb?: Db
): Promise<{ scans: ScanDocument[]; total: number }> {
  const db = customDb || (await getDatabase())
  if (!db) return { scans: [], total: 0 }

  await ensureHistoryIndexes(db)
  const collection = db.collection(COLLECTION_NAME)

  const query = { userId }
  const total = await collection.countDocuments(query)

  const safeLimit = Math.max(1, Math.min(limit, MAX_SCANS_PER_USER))
  const safeSkip = Math.max(0, (page - 1) * safeLimit)

  const docs = await collection
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .toArray()

  const scans: ScanDocument[] = docs.map(d => ({
    _id: d._id.toString(),
    userId: d.userId,
    category: d.category,
    confidence: d.confidence,
    explanation: d.explanation,
    disposalAction: d.disposalAction,
    recommendation: d.recommendation,
    feedback: d.feedback,
    createdAt:
      d.createdAt instanceof Date
        ? d.createdAt.toISOString()
        : String(d.createdAt),
  }))

  return { scans, total }
}

/**
 * Deletes a single scan record with verified user ownership.
 *
 * @returns true if deleted, false if not found or not owned by user.
 */
export async function deleteUserScan(
  userId: string,
  scanId: string,
  customDb?: Db
): Promise<boolean> {
  const db = customDb || (await getDatabase())
  if (!db) return false

  if (!ObjectId.isValid(scanId)) return false

  const collection = db.collection(COLLECTION_NAME)
  const result = await collection.deleteOne({
    _id: new ObjectId(scanId),
    userId,
  })

  return result.deletedCount === 1
}

/**
 * Clears all scan records for the authenticated user.
 */
export async function clearUserHistory(
  userId: string,
  customDb?: Db
): Promise<number> {
  const db = customDb || (await getDatabase())
  if (!db) return 0

  const collection = db.collection(COLLECTION_NAME)
  const result = await collection.deleteMany({ userId })
  return result.deletedCount
}

/**
 * Records user feedback for a specific scan.
 * Never overwrites or mutates original AI category or confidence score.
 */
export async function recordUserScanFeedback(
  userId: string,
  scanId: string,
  feedback: ClassificationFeedback,
  customDb?: Db
): Promise<boolean> {
  const db = customDb || (await getDatabase())
  if (!db) return false

  if (!ObjectId.isValid(scanId)) return false

  const collection = db.collection(COLLECTION_NAME)
  const result = await collection.updateOne(
    {
      _id: new ObjectId(scanId),
      userId,
    },
    {
      $set: {
        feedback: {
          wasCorrect: Boolean(feedback.wasCorrect),
          correctedCategory: feedback.correctedCategory,
          submittedAt: new Date().toISOString(),
        },
      },
    }
  )

  return result.matchedCount === 1
}

/**
 * Aggregates lightweight statistics from user's scan history.
 */
export async function getUserHistoryStats(
  userId: string,
  customDb?: Db
): Promise<HistoryStats> {
  const defaultCounts: Record<WasteCategory, number> = {
    recyclable: 0,
    organic: 0,
    hazardous: 0,
    electronic: 0,
    general: 0,
    unknown: 0,
  }

  const db = customDb || (await getDatabase())
  if (!db) {
    return {
      totalScans: 0,
      categoryCounts: defaultCounts,
    }
  }

  const collection = db.collection(COLLECTION_NAME)
  const docs = await collection
    .find({ userId }, { projection: { category: 1 } })
    .toArray()

  let total = 0
  for (const d of docs) {
    const cat = d.category as WasteCategory
    if (defaultCounts[cat] !== undefined) {
      defaultCounts[cat]++
      total++
    }
  }

  let mostCommonCategory: WasteCategory | undefined
  let maxCount = 0
  for (const [cat, count] of Object.entries(defaultCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostCommonCategory = cat as WasteCategory
    }
  }

  return {
    totalScans: total,
    categoryCounts: defaultCounts,
    mostCommonCategory,
  }
}
