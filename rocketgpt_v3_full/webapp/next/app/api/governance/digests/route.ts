import { NextRequest, NextResponse } from 'next/server'

import { listWeeklyDigests } from '@/lib/db/governanceRepo'
import { isPrivilegedRead } from '@/lib/governance/auth'
import { runWeeklyDigestJob } from '@/lib/governance/digest-job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  try {
    if (!isPrivilegedRead(req)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    await runWeeklyDigestJob(false)
    const items = await listWeeklyDigests()
    return NextResponse.json({ items }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch weekly digests.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
