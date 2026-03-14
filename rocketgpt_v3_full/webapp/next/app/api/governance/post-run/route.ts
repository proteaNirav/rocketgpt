import { NextRequest, NextResponse } from 'next/server'

import { logGovernancePostRun } from '@/lib/governance/governance-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.runId || !body?.workflowId || !body?.crpsId || !Array.isArray(body?.results)) {
      return NextResponse.json(
        { error: 'runId, workflowId, crpsId, and results are required.' },
        { status: 400 },
      )
    }
    await logGovernancePostRun({
      runId: String(body.runId),
      workflowId: String(body.workflowId),
      crpsId: String(body.crpsId),
      results: body.results,
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Governance post-run logging failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
