import { NextRequest, NextResponse } from 'next/server'

import { listForesightTasks } from '@/lib/db/governanceRepo'
import { isPrivilegedRead } from '@/lib/governance/auth'
import type { ForesightTaskStatus } from '@/lib/governance/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function parseStatus(value: string | null): ForesightTaskStatus | undefined {
  if (!value) return undefined
  if (value === 'open' || value === 'in_review' || value === 'resolved') return value
  return undefined
}

function redactForOperator(rows: any[]): any[] {
  return rows.map((row) => ({
    id: row.id,
    crps_id: row.crps_id,
    summary: row.summary,
    status: row.status,
    domain_queues: row.domain_queues,
    created_at: row.created_at,
    detail: 'Restricted. Request admin/auditor role for full foresight details.',
  }))
}

export async function GET(req: NextRequest) {
  try {
    const status = parseStatus(req.nextUrl.searchParams.get('status'))
    const rows = await listForesightTasks(status)
    const data = isPrivilegedRead(req) ? rows : redactForOperator(rows)
    return NextResponse.json({ items: data }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch foresight tasks.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
