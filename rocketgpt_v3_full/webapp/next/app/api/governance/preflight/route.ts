import { NextRequest, NextResponse } from 'next/server'

import { evaluateGovernancePreflight } from '@/lib/governance/governance-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.runId || !body?.workflowId || !Array.isArray(body?.nodes)) {
      return NextResponse.json(
        { error: 'runId, workflowId, and nodes are required.' },
        { status: 400 },
      )
    }

    const result = await evaluateGovernancePreflight({
      runId: String(body.runId),
      workflowId: String(body.workflowId),
      nodes: body.nodes,
      params: body.params ?? {},
      actorId: body.actorId ?? null,
      orgId: body.orgId ?? null,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Governance preflight failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
