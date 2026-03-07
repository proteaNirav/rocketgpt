import { NextRequest, NextResponse } from 'next/server'

import { canWriteAsOwnerOrAdmin, readActor } from '@/lib/cats/api-auth'
import { recordCatsTransitionLedgerEvent } from '@/lib/cats/ledger'
import { canTransition } from '@/lib/cats/lifecycle'
import type { CatsStatus } from '@/lib/db/catsRepo'
import { getCatById, transitionCat } from '@/lib/db/catsRepo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

type Ctx = { params: Promise<{ catId: string }> }

const VALID_STATUS: CatsStatus[] = [
  'draft',
  'review',
  'approved',
  'active',
  'deprecated',
  'revoked',
]

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readActor(req)
    const { catId } = await ctx.params
    const cat = await getCatById(actor.tenantId, catId)
    if (!cat) return NextResponse.json({ error: 'CAT not found.' }, { status: 404 })
    if (!canWriteAsOwnerOrAdmin(actor, cat.owner_user_id)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const targetStatus = String(body?.targetStatus || '').trim() as CatsStatus
    if (!VALID_STATUS.includes(targetStatus)) {
      return NextResponse.json({ error: 'Invalid targetStatus.' }, { status: 400 })
    }
    if (!canTransition(cat.status, targetStatus)) {
      return NextResponse.json(
        { error: `Invalid transition: ${cat.status} -> ${targetStatus}` },
        { status: 400 },
      )
    }

    const updated = await transitionCat({ tenantId: actor.tenantId, catId, status: targetStatus })
    if (!updated) return NextResponse.json({ error: 'CAT not found.' }, { status: 404 })

    await recordCatsTransitionLedgerEvent({
      actor: { userId: actor.userId, isAdmin: actor.isAdmin, tenantId: actor.tenantId },
      catId,
      action: 'cats.transition',
      beforeStatus: cat.status,
      afterStatus: updated.status,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transition CAT.' },
      { status: 400 },
    )
  }
}
