import { test, expect } from '@playwright/test'

// SLOW end-to-end tester smoke test.
// NOTE: This test is intentionally skipped by default because
// /api/tester/run may trigger heavy flows depending on infra state.
// Enable by changing test.skip(...) to test(...) once stable.

test.describe('SLOW Tester /api/tester/run smoke', () => {
  test.skip('POST /api/tester/run returns a structured result', async ({ request }) => {
    const response = await request.post('/api/tester/run', {
      data: {},
    })

    const status = response.status()
    console.log('[SLOW-TESTER] /api/tester/run status:', status)

    expect(status).toBe(200)

    const body = await response.json()
    console.log('[SLOW-TESTER] /api/tester/run body:', body)

    expect(typeof body).toBe('object')

    if ('success' in body) {
      expect(typeof (body as any).success).toBe('boolean')
    }

    if ('tester' in body && (body as any).tester) {
      const tester: any = (body as any).tester

      if ('status' in tester) {
        expect(typeof tester.status).toBe('string')
      }

      if ('results' in tester) {
        expect(Array.isArray(tester.results)).toBe(true)
      }
    }
  })
})
