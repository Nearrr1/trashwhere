/**
 * Server-side sliding-window in-memory rate limiter.
 *
 * Protects public endpoints (like POST /api/classify) from excessive automated requests,
 * denial-of-service, and quota exhaustion on external AI providers.
 *
 * Operates per client IP with automatic timestamp pruning.
 */

export interface RateLimitConfig {
  /** Maximum number of allowed requests in the time window */
  maxRequests: number
  /** Time window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is permitted */
  success: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Number of remaining requests permitted in the current window */
  remaining: number
  /** Number of seconds until the oldest request falls out of the window */
  resetSeconds: number
}

// In-memory store: Map<clientIp, Array<timestampMs>>
const requestStore = new Map<string, number[]>()

// Default production thresholds: 15 requests per 60 seconds per IP
const DEFAULT_MAX_REQUESTS = 15
const DEFAULT_WINDOW_MS = 60_000 // 1 minute

/**
 * Extracts client IP from standard proxy / CDN headers or fallback.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers

  // 1. Cloudflare
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  // 2. X-Forwarded-For (take the first / client IP in chain)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  // 3. X-Real-IP
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return '127.0.0.1'
}

/**
 * Checks and updates rate limit for a given client identifier (e.g. IP).
 */
export function checkRateLimit(
  identifier: string,
  config?: Partial<RateLimitConfig>
): RateLimitResult {
  const maxRequests =
    config?.maxRequests ??
    (process.env.RATE_LIMIT_MAX_REQUESTS
      ? Number(process.env.RATE_LIMIT_MAX_REQUESTS)
      : DEFAULT_MAX_REQUESTS)

  const windowMs =
    config?.windowMs ??
    (process.env.RATE_LIMIT_WINDOW_MS
      ? Number(process.env.RATE_LIMIT_WINDOW_MS)
      : DEFAULT_WINDOW_MS)

  const now = Date.now()
  const windowStart = now - windowMs

  // Clean up old entries across the store if it grows too large (prevent memory leak)
  if (requestStore.size > 10_000) {
    for (const [ip, timestamps] of requestStore.entries()) {
      const valid = timestamps.filter(t => t > windowStart)
      if (valid.length === 0) {
        requestStore.delete(ip)
      } else {
        requestStore.set(ip, valid)
      }
    }
  }

  const existingTimestamps = requestStore.get(identifier) ?? []
  // Filter out timestamps outside the active window
  const validTimestamps = existingTimestamps.filter(t => t > windowStart)

  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0]
    const resetSeconds = Math.max(
      1,
      Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    )

    requestStore.set(identifier, validTimestamps)

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds,
    }
  }

  // Record this request
  validTimestamps.push(now)
  requestStore.set(identifier, validTimestamps)

  const remaining = Math.max(0, maxRequests - validTimestamps.length)
  const oldestTimestamp = validTimestamps[0]
  const resetSeconds = Math.max(
    1,
    Math.ceil((oldestTimestamp + windowMs - now) / 1000)
  )

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetSeconds,
  }
}

/**
 * Resets the in-memory rate limiter store (primarily for unit tests).
 */
export function resetRateLimiter(): void {
  requestStore.clear()
}
