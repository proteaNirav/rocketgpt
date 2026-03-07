import { NextRequest, NextResponse } from 'next/server'

import { isAdminWrite } from '@/lib/governance/auth'
import { runWeeklyDigestJob } from '@/lib/governance/digest-job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  try {
    if (!isAdminWrite(req)) {
      return NextResponse.json({ error: 'Admin token required.' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const force = Boolean(body?.force)
    const result = await runWeeklyDigestJob(force)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run weekly digest job.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
