import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  getClientIp,
  resetRateLimiter,
} from '../rate-limiter'

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimiter()
  })

  it('extracts IP from various proxy and direct headers', () => {
    const cfReq = new Request('http://localhost/api/classify', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    })
    expect(getClientIp(cfReq)).toBe('1.2.3.4')

    const fwdReq = new Request('http://localhost/api/classify', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    })
    expect(getClientIp(fwdReq)).toBe('10.0.0.1')

    const realIpReq = new Request('http://localhost/api/classify', {
      headers: { 'x-real-ip': '172.16.0.5' },
    })
    expect(getClientIp(realIpReq)).toBe('172.16.0.5')

    const defaultReq = new Request('http://localhost/api/classify')
    expect(getClientIp(defaultReq)).toBe('127.0.0.1')
  })

  it('allows requests up to the max threshold and tracks remaining correctly', () => {
    const config = { maxRequests: 3, windowMs: 10_000 }
    const ip = '192.168.1.100'

    const r1 = checkRateLimit(ip, config)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = checkRateLimit(ip, config)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = checkRateLimit(ip, config)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)

    // Exceeding limit
    const r4 = checkRateLimit(ip, config)
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
    expect(r4.resetSeconds).toBeGreaterThan(0)
  })

  it('isolates different IP addresses', () => {
    const config = { maxRequests: 1, windowMs: 10_000 }

    const r1 = checkRateLimit('10.0.0.1', config)
    expect(r1.success).toBe(true)

    // Same IP blocked
    const r1Blocked = checkRateLimit('10.0.0.1', config)
    expect(r1Blocked.success).toBe(false)

    // Different IP allowed
    const r2 = checkRateLimit('10.0.0.2', config)
    expect(r2.success).toBe(true)
  })
})
