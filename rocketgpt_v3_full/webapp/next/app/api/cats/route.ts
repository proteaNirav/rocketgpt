import { NextRequest, NextResponse } from 'next/server'

import { readActor } from '@/lib/cats/api-auth'
import { recordCatsLedgerEvent } from '@/lib/cats/ledger'
import { createCat, listCats } from '@/lib/db/catsRepo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function parsePage(value: string | null, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.floor(n)
}

export async function GET(req: NextRequest) {
  try {
    const actor = readActor(req)
    const page = parsePage(req.nextUrl.searchParams.get('page'), 1)
    const pageSize = Math.min(parsePage(req.nextUrl.searchParams.get('pageSize'), 20), 100)
    const result = await listCats({ tenantId: actor.tenantId, page, pageSize })
    return NextResponse.json({ page, pageSize, total: result.total, items: result.items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list CATS.' },
      { status: 400 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = readActor(req)
    const body = await req.json().catch(() => null)
    const name = String(body?.name ?? '').trim()
    const description = String(body?.description ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 })
    }
    if (!actor.isAdmin && !actor.userId) {
      return NextResponse.json(
        { error: 'Owner user or admin token required for writes.' },
        { status: 401 },
      )
    }
    const created = await createCat({
      tenantId: actor.tenantId,
      ownerUserId: actor.userId,
      name,
      description: description || null,
    })

    await recordCatsLedgerEvent({
      actor: { userId: actor.userId, isAdmin: actor.isAdmin, tenantId: actor.tenantId },
      catId: created.id,
      action: 'cats.create',
      beforeStatus: null,
      afterStatus: created.status,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create CAT.'
    const status = message.toLowerCase().includes('duplicate') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
