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
type LogEntry = {
  id: string
  timestamp: string
  endpoint: string
  model: string
  status: 'ok' | 'error'
  tokens?: number
}

const demoLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    endpoint: '/api/demo/chat',
    model: 'gpt-4o-mini',
    status: 'ok',
    tokens: 320,
  },
  {
    id: '2',
    timestamp: new Date().toISOString(),
    endpoint: '/api/planner',
    model: 'gpt-4o-mini',
    status: 'error',
    tokens: 0,
  },
]

export async function GET(request: Request) {
  try {
    // Infra route: decision optional; enforce only if provided.
    if (hasDecisionId(request)) {
      await runtimeGuard(request, { permission: 'API_CALL' })
    }

    // In future, replace demoLogs with real DB-backed logs from Supabase/Postgres.
    return NextResponse.json({
      logs: demoLogs,
    })
  } catch (e: any) {
    const safe = toSafeError(e)
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      {
        ok: false,
        route: '//api/logs',
        error: { name: safe.name, message: safe.message, ...(isDev ? { stack: safe.stack } : {}) },
      },
      { status: 500 },
    )
  }
}
