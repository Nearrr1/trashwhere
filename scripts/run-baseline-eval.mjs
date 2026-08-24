import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.APP_URL || 'http://localhost:3000'
const DATASET_PATH = path.resolve('docs/evaluation/phase-4c-dataset.json')
const IMAGES_DIR = path.resolve('docs/evaluation/images')
const OUTPUT_RESULTS_PATH = path.resolve('docs/evaluation/phase-4c-baseline-results-v2.json')

async function run() {
  console.log(`Starting Phase 4C Baseline V2 Evaluation (with rate-limit protection)...`)
  console.log(`Endpoint: ${BASE_URL}/api/classify`)
  console.log(`Output: ${OUTPUT_RESULTS_PATH}`)

  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`Dataset not found at ${DATASET_PATH}`)
    process.exit(1)
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'))
  const cases = dataset.cases

  console.log(`Loaded ${cases.length} test cases from dataset.`)

  const results = []

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i]
    const imgPath = path.join(IMAGES_DIR, testCase.file)

    if (!fs.existsSync(imgPath)) {
      console.error(`Image missing: ${imgPath}`)
      process.exit(1)
    }

    const fileBuffer = fs.readFileSync(imgPath)
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' })

    console.log(`[${i + 1}/${cases.length}] Evaluating ${testCase.id} (${testCase.file}) - Expected: ${testCase.expectedCategory}...`)

    let responseData = null
    let errorMsg = null
    let duration = 0
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const formData = new FormData()
      formData.append('image', blob, testCase.file)

      const startTime = Date.now()
      errorMsg = null
      responseData = null

      try {
        const res = await fetch(`${BASE_URL}/api/classify`, {
          method: 'POST',
          body: formData,
        })

        const json = await res.json()
        duration = Date.now() - startTime

        if (!res.ok) {
          errorMsg = `HTTP ${res.status}: ${JSON.stringify(json)}`
          if (attempt < maxRetries && (res.status === 502 || res.status === 504 || res.status === 429)) {
            console.log(`  [Attempt ${attempt} failed: ${errorMsg}. Waiting 20s for rate-limit reset...]`)
            await new Promise((r) => setTimeout(r, 20000))
            continue
          }
        } else {
          responseData = json
          break
        }
      } catch (err) {
        duration = Date.now() - startTime
        errorMsg = err.message
        if (attempt < maxRetries) {
          console.log(`  [Attempt ${attempt} failed: ${errorMsg}. Retrying in 10s...]`)
          await new Promise((r) => setTimeout(r, 10000))
        }
      }
    }

    if (errorMsg || !responseData) {
      console.error(`  FAILED: ${errorMsg}`)
      results.push({
        id: testCase.id,
        expectedCategory: testCase.expectedCategory,
        predictedCategory: 'unknown',
        confidence: 0,
        correct: false,
        lowConfidence: true,
        falseConfidence: false,
        disposalActionReview: 'fail',
        explanation: `Evaluation error: ${errorMsg}`,
        disposalAction: '',
        notes: `Execution failed: ${errorMsg}`,
        latencyMs: duration,
      })
    } else {
      const predictedCategory = responseData.category
      const confidence = responseData.confidence
      const correct = predictedCategory === testCase.expectedCategory
      const lowConfidence = confidence < 0.60
      const falseConfidence = !correct && confidence >= 0.60

      console.log(`  -> Predicted: ${predictedCategory} (${confidence}) | Correct: ${correct} | Latency: ${duration}ms`)

      results.push({
        id: testCase.id,
        expectedCategory: testCase.expectedCategory,
        predictedCategory,
        confidence,
        correct,
        lowConfidence,
        falseConfidence,
        disposalActionReview: 'pending_review',
        explanation: responseData.explanation,
        disposalAction: responseData.disposalAction,
        notes: testCase.notes,
        scenario: testCase.scenario,
        difficulty: testCase.difficulty,
        latencyMs: duration,
      })
    }

    // Pacing delay between calls (4.5s to comfortably stay under 15 RPM)
    await new Promise((r) => setTimeout(r, 4500))
  }

  const baselineData = {
    version: 'v2',
    runDate: new Date().toISOString().split('T')[0],
    provider: 'Google Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    threshold: 0.60,
    totalCases: cases.length,
    results,
  }

  fs.writeFileSync(OUTPUT_RESULTS_PATH, JSON.stringify(baselineData, null, 2), 'utf-8')
  console.log(`\nBaseline V2 evaluation complete! Results saved to ${OUTPUT_RESULTS_PATH}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
