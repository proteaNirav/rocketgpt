import { NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'

export const runtime = 'nodejs'

function hasDecisionId(request: Request): boolean {
  try {
    const h = request.headers
    const v = h.get('x-rgpt-decision-id') || h.get('X-RGPT-Decision-Id') || ''
    return String(v).trim().length > 0
  } catch {
    return false
  }
}

function toSafeError(err: any) {
  const msg = (err && (err.message || String(err))) || 'unknown error'
  const name = (err && err.name) || 'Error'
  const stack = err && err.stack ? String(err.stack) : undefined
  return { name, message: msg, stack }
}

export async function GET(request: Request) {
  try {
    // Health must be callable without a decision id.
    // If a decision id IS provided, enforce runtime decision ledger.
    if (hasDecisionId(request)) {
      await runtimeGuard(request, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
    }

    const startedAt = new Date().toISOString()
    const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown'
    const version = process.env.NEXT_PUBLIC_APP_VERSION || 'v0'

    return NextResponse.json({
      ok: true,
      startedAt,
      commit,
      version,
      guarded: hasDecisionId(request),
      services: {
        vercel: 'assumed-ok',
        railway: 'assumed-ok',
        supabase: 'assumed-ok',
      },
    })
  } catch (e: any) {
    const safe = toSafeError(e)
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        ok: false,
        route: '/api/health',
        error: {
          name: safe.name,
          message: safe.message,
          ...(isDev ? { stack: safe.stack } : {}),
        },
      },
      { status: 500 },
    )
  }
}
