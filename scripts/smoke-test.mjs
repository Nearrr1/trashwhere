import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'http://localhost:3005'

async function runSmokeTests() {
  console.log(`Starting Phase 5B Production Smoke Test against ${BASE_URL}...\n`)
  let passed = 0
  let failed = 0

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`)
      passed++
    } else {
      console.error(`  ✗ [FAIL] ${name}: ${details}`)
      failed++
    }
  }

  // 1. Test GET / (Landing Page)
  try {
    const res = await fetch(`${BASE_URL}/`)
    const text = await res.text()
    assert('GET / returns HTTP 200', res.status === 200)
    assert('GET / includes HTML content', text.includes('TrashWhere') || text.includes('Phân loại'))
    assert('GET / has X-Frame-Options: DENY', res.headers.get('x-frame-options') === 'DENY')
    assert('GET / has X-Content-Type-Options: nosniff', res.headers.get('x-content-type-options') === 'nosniff')
    assert('GET / has Strict-Transport-Security', !!res.headers.get('strict-transport-security'))
    assert('GET / has Permissions-Policy', !!res.headers.get('permissions-policy'))
  } catch (err) {
    assert('GET / connectivity', false, err.message)
  }

  // 2. Test GET /learn (Static Education Page)
  try {
    const res = await fetch(`${BASE_URL}/learn`)
    const text = await res.text()
    assert('GET /learn returns HTTP 200', res.status === 200)
    assert('GET /learn renders category list', text.includes('Rác tái chế') && text.includes('Rác hữu cơ'))
  } catch (err) {
    assert('GET /learn connectivity', false, err.message)
  }

  // 3. Test POST /api/classify with missing image
  try {
    const formData = new FormData()
    const res = await fetch(`${BASE_URL}/api/classify`, {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    assert('POST /api/classify with missing image returns HTTP 400', res.status === 400)
    assert('POST /api/classify error code is VALIDATION_ERROR', body.code === 'VALIDATION_ERROR')
    assert('POST /api/classify returns X-RateLimit headers', !!res.headers.get('x-ratelimit-limit'))
  } catch (err) {
    assert('POST /api/classify missing image', false, err.message)
  }

  // 4. Test POST /api/classify with invalid fake image (text file)
  try {
    const formData = new FormData()
    const fakeBlob = new Blob(['Not an image content'], { type: 'image/jpeg' })
    formData.append('image', fakeBlob, 'fake.jpg')
    const res = await fetch(`${BASE_URL}/api/classify`, {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    assert('POST /api/classify with fake image returns HTTP 400', res.status === 400)
    assert('POST /api/classify rejects invalid magic bytes', body.error === 'INVALID_FILE_TYPE')
  } catch (err) {
    assert('POST /api/classify fake image', false, err.message)
  }

  // 5. Test POST /api/classify with oversized payload (> 10MB)
  try {
    const formData = new FormData()
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
    const largeBlob = new Blob([largeBuffer], { type: 'image/jpeg' })
    formData.append('image', largeBlob, 'large.jpg')
    const res = await fetch(`${BASE_URL}/api/classify`, {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    assert('POST /api/classify with oversized file returns HTTP 413', res.status === 413)
    assert('POST /api/classify oversized payload code is FILE_TOO_LARGE', body.code === 'FILE_TOO_LARGE')
  } catch (err) {
    assert('POST /api/classify oversized payload', false, err.message)
  }

  // 6. Test POST /api/classify with real evaluation image
  try {
    const imagePath = path.resolve(__dirname, '../docs/evaluation/images/rw-001.jpg')
    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath)
      const blob = new Blob([buffer], { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('image', blob, 'rw-001.jpg')

      const res = await fetch(`${BASE_URL}/api/classify`, {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.25' },
        body: formData,
      })
      const body = await res.json()
      assert('POST /api/classify with real image returns HTTP 200', res.status === 200)
      assert('Classification response has canonical category', ['recyclable', 'organic', 'hazardous', 'electronic', 'general', 'unknown'].includes(body.category))
      assert('Classification response has confidence in [0, 1]', typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 1)
      assert('Classification response has explanation', typeof body.explanation === 'string' && body.explanation.length > 0)
      assert('Classification response has disposalAction', typeof body.disposalAction === 'string' && body.disposalAction.length > 0)
      console.log(`    Result: category=${body.category}, confidence=${body.confidence}, explanation="${body.explanation.slice(0, 50)}..."`)
    } else {
      console.log('  ⚠ Skipping real image test (sample not found)')
    }
  } catch (err) {
    assert('POST /api/classify real image', false, err.message)
  }

  // 7. Test Rate Limiting Trigger (using distinct spoofed IP or burst)
  try {
    const burstIp = '203.0.113.99'
    let rateLimited = false
    let retryAfterHeader = null

    // Send 18 rapid requests with burstIp (threshold is 15)
    for (let i = 0; i < 18; i++) {
      const formData = new FormData()
      formData.append('image', new Blob(['test']), 'test.txt')
      const res = await fetch(`${BASE_URL}/api/classify`, {
        method: 'POST',
        headers: { 'x-forwarded-for': burstIp },
        body: formData,
      })
      if (res.status === 429) {
        rateLimited = true
        retryAfterHeader = res.headers.get('retry-after')
        break
      }
    }

    assert('Rate limiter triggers HTTP 429 when threshold exceeded', rateLimited)
    assert('HTTP 429 response includes Retry-After header', !!retryAfterHeader)
  } catch (err) {
    assert('Rate limiter burst test', false, err.message)
  }

  console.log(`\nSmoke Test Summary: ${passed} passed, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

runSmokeTests()
