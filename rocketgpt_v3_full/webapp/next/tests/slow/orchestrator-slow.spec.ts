import { test, expect } from '@playwright/test'

// SLOW end-to-end orchestrator smoke test.
// NOTE: This test is intentionally skipped by default because
// /api/orchestrator/builder/execute-all can be very slow or blocked
// depending on external LLM / infra state.
// Enable by changing test.skip(...) to test(...) once the pipeline is stable.

test.describe('SLOW Orchestrator execute-all smoke', () => {
  test.skip('POST /api/orchestrator/builder/execute-all returns a structured result', async ({
    request,
  }) => {
    const response = await request.post('/api/orchestrator/builder/execute-all', {
      data: {},
    })

    const status = response.status()
    console.log('[SLOW-ORCH] /api/orchestrator/builder/execute-all status:', status)

    expect(status).toBe(200)

    const body = await response.json()
    console.log('[SLOW-ORCH] /api/orchestrator/builder/execute-all body:', body)

    expect(typeof body).toBe('object')

    if ('success' in body) {
      expect(typeof (body as any).success).toBe('boolean')
    }

    if ('builder' in body && (body as any).builder) {
      const builder: any = (body as any).builder

      if ('success' in builder) {
        expect(typeof builder.success).toBe('boolean')
      }

      if ('tester' in builder && builder.tester) {
        const tester: any = builder.tester

        if ('status' in tester) {
          expect(typeof tester.status).toBe('string')
        }

        if ('results' in tester) {
          expect(Array.isArray(tester.results)).toBe(true)
        }
      }
    }
  })
})
