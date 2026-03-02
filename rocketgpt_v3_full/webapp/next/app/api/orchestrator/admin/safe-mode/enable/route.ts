export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { enableSafeMode, getSafeMode } from '../../../_core/safeMode'
export const runtime = 'nodejs'

const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY

/**
 * POST /api/orchestrator/admin/safe-mode/enable
 * Enables Safe-Mode.
 * Secured via x-rgpt-internal header.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error_code: 'RUNTIME_GUARD_BLOCKED',
        message: 'Blocked by runtime guard.',
        reason: String(e?.message ?? e),
      },
      { status: 403 },
    )
  }
  // Enforce internal key
  if (INTERNAL_KEY) {
    const hdr = req.headers.get('x-rgpt-internal') ?? ''
    if (hdr !== INTERNAL_KEY) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'UNAUTHORIZED',
          message: 'Invalid or missing x-rgpt-internal header.',
        },
        { status: 401 },
      )
    }
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const reason = body?.reason ?? 'Safe-Mode enabled by admin API.'

  enableSafeMode(reason)

  return NextResponse.json(
    {
      success: true,
      message: 'Safe-Mode enabled.',
      safe_mode: getSafeMode(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
