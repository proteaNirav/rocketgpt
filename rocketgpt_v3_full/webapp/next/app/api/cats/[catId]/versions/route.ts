import { NextRequest, NextResponse } from 'next/server'

import { canWriteAsOwnerOrAdmin, readActor } from '@/lib/cats/api-auth'
import { recordCatsLedgerEvent } from '@/lib/cats/ledger'
import { ALLOWED_PUBLISH_CAT_STATUSES, SEMVER_PATTERN } from '@/lib/cats/lifecycle'
import { createPublishedVersion, getCatById, listVersions } from '@/lib/db/catsRepo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

type Ctx = { params: Promise<{ catId: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readActor(req)
    const { catId } = await ctx.params
    const cat = await getCatById(actor.tenantId, catId)
    if (!cat) return NextResponse.json({ error: 'CAT not found.' }, { status: 404 })
    const items = await listVersions(actor.tenantId, catId)
    return NextResponse.json({ items }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list versions.' },
      { status: 400 },
    )
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readActor(req)
    const { catId } = await ctx.params
    const cat = await getCatById(actor.tenantId, catId)
    if (!cat) return NextResponse.json({ error: 'CAT not found.' }, { status: 404 })
    if (!canWriteAsOwnerOrAdmin(actor, cat.owner_user_id)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    if (!ALLOWED_PUBLISH_CAT_STATUSES.has(cat.status)) {
      return NextResponse.json(
        { error: 'Version publish allowed only in draft/approved.' },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => null)
    const version = String(body?.version || '').trim()
    const commandBundleRef = String(body?.commandBundleRef || '').trim()
    const manifestJson =
      body?.manifestJson && typeof body.manifestJson === 'object' ? body.manifestJson : {}
    const rulebookJson =
      body?.rulebookJson && typeof body.rulebookJson === 'object' ? body.rulebookJson : {}
    if (!SEMVER_PATTERN.test(version)) {
      return NextResponse.json({ error: 'version must be semver.' }, { status: 400 })
    }
    if (!commandBundleRef) {
      return NextResponse.json({ error: 'commandBundleRef is required.' }, { status: 400 })
    }

    const created = await createPublishedVersion({
      tenantId: actor.tenantId,
      catId,
      version,
      manifestJson,
      rulebookJson,
      commandBundleRef,
    })

    await recordCatsLedgerEvent({
      actor: { userId: actor.userId, isAdmin: actor.isAdmin, tenantId: actor.tenantId },
      catId,
      action: 'cats.version.publish',
      beforeStatus: cat.status,
      afterStatus: cat.status,
      catVersionId: created.id,
      version: created.version,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish version.'
    const status = message.toLowerCase().includes('duplicate') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
