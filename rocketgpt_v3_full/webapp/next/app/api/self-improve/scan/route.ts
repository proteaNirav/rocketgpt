import { NextRequest, NextResponse } from 'next/server'
import { isPrivilegedRead } from '@/lib/governance/auth'
import { checkRateLimit } from '../_lib/rateLimit'
import { isSelfImproveEnabled, runSelfImproveCli } from '../_lib/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  if (!isSelfImproveEnabled()) {
    return NextResponse.json({ error: 'SELF_IMPROVE_ENABLED is false.' }, { status: 503 })
  }
  if (!isPrivilegedRead(req)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }
  const ip = req.headers.get('x-forwarded-for') || 'local'
  const limited = checkRateLimit(`scan:${ip}`, 10, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  const actor =
    req.headers.get('x-user-id') || `user:${req.headers.get('x-governance-role') || 'unknown'}`
  try {
    const result = await runSelfImproveCli(['scan', '--actor', actor])
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'scan failed' },
      { status: 500 },
    )
  }
}
