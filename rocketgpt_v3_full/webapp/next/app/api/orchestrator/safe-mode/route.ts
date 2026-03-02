import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { getSafeModeEnabled, setSafeModeEnabled } from '@/lib/orchestrator/safeModeState'
export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    safe_mode: {
      enabled: getSafeModeEnabled(),
    },
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  await runtimeGuard(request, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  try {
    const body = await request.json().catch(() => ({}))
    const { enabled } = body as { enabled?: boolean }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payload. Expected JSON body: { "enabled": boolean }',
        },
        { status: 400 },
      )
    }

    setSafeModeEnabled(enabled)

    return NextResponse.json({
      success: true,
      safe_mode: {
        enabled: getSafeModeEnabled(),
      },
      message: getSafeModeEnabled()
        ? 'Orchestrator Safe Mode ENABLED.'
        : 'Orchestrator Safe Mode DISABLED.',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[safe-mode] Error updating safe mode:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected error while updating safe mode.',
      },
      { status: 500 },
    )
  }
}
