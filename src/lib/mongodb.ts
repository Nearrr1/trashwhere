/**
 * MongoDB Atlas Connection Management for Next.js App Router (Phase 13 / Phase E2E Fix).
 *
 * Implements resilient connection caching across serverless invocations and HMR,
 * with bounded timeouts (5s) and lazy connection to prevent unhandled rejection crashes
 * during build or module evaluation.
 *
 * Provides a graceful fallback when MONGODB_URI is not set or network is unreachable,
 * ensuring anonymous scanning and core classification continue to operate without crashing.
 */

import { MongoClient, Db } from 'mongodb'

const DEFAULT_DB_NAME = 'trashwhere'

const uri = process.env.MONGODB_URI?.trim()
const dbName = process.env.MONGODB_DB?.trim() || DEFAULT_DB_NAME

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient | null = null

function getClientPromise(): Promise<MongoClient> | null {
  if (!uri) return null

  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, mongoOptions)
    global._mongoClientPromise = client.connect().catch(err => {
      console.error('MongoDB Atlas connection failed:', err)
      // Reset promise so subsequent requests can retry after network resolves
      global._mongoClientPromise = undefined
      throw err
    })
  }
  return global._mongoClientPromise
}

/**
 * Returns the cached MongoClient promise, or null if MONGODB_URI is not configured.
 */
export function getMongoClientPromise(): Promise<MongoClient> | null {
  return getClientPromise()
}

/**
 * Retrieves the MongoDB database instance.
 * Returns null if MONGODB_URI is not defined or connection fails.
 */
export async function getDatabase(): Promise<Db | null> {
  const promise = getClientPromise()
  if (!promise) {
    return null
  }
  try {
    const connectedClient = await promise
    return connectedClient.db(dbName)
  } catch (err) {
    console.error('Failed to get database instance from MongoDB Atlas:', err)
    return null
  }
}
