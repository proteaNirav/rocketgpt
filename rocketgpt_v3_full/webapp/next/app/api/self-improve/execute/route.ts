import { NextRequest, NextResponse } from 'next/server'
import { isAdminWrite } from '@/lib/governance/auth'
import { checkRateLimit } from '../_lib/rateLimit'
import { isSelfImproveEnabled, runSelfImproveCli } from '../_lib/runner'

function isSafeProposalId(v: string) {
  // prevent path traversal / injection: allow only conservative ids
  // Example expected: SI-20260304-1200-ABCD
  return (
    /^[A-Za-z0-9][A-Za-z0-9._-]{2,80}$/.test(v) &&
    !v.includes('..') &&
    !v.includes('/') &&
    !v.includes('\\')
  )
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  if (!isSelfImproveEnabled()) {
    return NextResponse.json({ error: 'SELF_IMPROVE_ENABLED is false.' }, { status: 503 })
  }
  if (!isAdminWrite(req)) {
    return NextResponse.json({ error: 'Admin token required.' }, { status: 401 })
  }
  const ip = req.headers.get('x-forwarded-for') || 'local'
  const limited = checkRateLimit(`execute:${ip}`, 6, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const proposalId = String(body?.proposal_id || '').trim()
  if (!isSafeProposalId(proposalId)) {
    return NextResponse.json({ error: 'Invalid proposal_id format.' }, { status: 400 })
  }

  const confirmed = body?.confirmed === true
  const dryRun = body?.dry_run === true
  if (!proposalId) {
    return NextResponse.json({ error: 'proposal_id is required' }, { status: 400 })
  }
  if (!confirmed) {
    return NextResponse.json(
      { error: 'Execution requires explicit confirmed=true.' },
      { status: 400 },
    )
  }

  const actor = req.headers.get('x-user-id') || 'admin:self-improve'
  try {
    const args = ['execute', '--proposal', proposalId, '--actor', actor]
    if (dryRun) args.push('--dry-run')
    const result = await runSelfImproveCli(args)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'execute failed' },
      { status: 500 },
    )
  }
}
