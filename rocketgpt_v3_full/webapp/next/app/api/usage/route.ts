import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UsageEntry = {
  date: string
  requests: number
  tokens: number
}

/**
 * GET /api/usage
 * Phase-1: Returns empty/stub usage data with stable schema.
 * Always returns 200 to avoid demo-breaking 500 errors.
 */
export async function GET() {
  try {
    // Phase-1: Return empty usage - analytics not wired yet
    const response = {
      ok: true,
      usage: [] as UsageEntry[],
      totals: { requests: 0, tokens: 0 },
      range: { from: null, to: null },
      message: 'Usage analytics is not enabled yet.',
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    // Even on error, return 200 with empty state for Phase-1
    console.error('[/api/usage] Error:', err)
    return NextResponse.json({
      ok: true,
      usage: [],
      totals: { requests: 0, tokens: 0 },
      range: { from: null, to: null },
      message: 'Usage data unavailable.',
    })
  }
}
