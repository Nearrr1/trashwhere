/**
 * MongoDB Atlas Connection Management for Next.js App Router (Phase 13).
 *
 * Implements connection caching across hot reloads and serverless invocations
 * to prevent leaking connection pools.
 *
 * Provides a graceful fallback when MONGODB_URI is not set, ensuring that
 * anonymous scanning and core classification continue to operate without crashing.
 */

import { MongoClient, Db } from 'mongodb'

const DEFAULT_DB_NAME = 'trashwhere'

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const uri = process.env.MONGODB_URI?.trim()
const dbName = process.env.MONGODB_DB?.trim() || DEFAULT_DB_NAME

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so the client promise
    // is preserved across module reloads caused by HMR.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    // In production mode, avoid using global scope
    client = new MongoClient(uri)
    clientPromise = client.connect()
  }
}

/**
 * Returns the cached MongoClient promise, or null if MONGODB_URI is not configured.
 */
export function getMongoClientPromise(): Promise<MongoClient> | null {
  return clientPromise
}

/**
 * Retrieves the MongoDB database instance.
 * Returns null if MONGODB_URI is not defined.
 */
export async function getDatabase(): Promise<Db | null> {
  if (!clientPromise) {
    return null
  }
  try {
    const connectedClient = await clientPromise
    return connectedClient.db(dbName)
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err)
    return null
  }
}
