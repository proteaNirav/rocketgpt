export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { withOrchestratorHandler } from '../_utils/orchestratorError'
export const runtime = 'nodejs'

const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY
const INTERNAL_BASE_URL =
  process.env.RGPT_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function summarizeBody(body: unknown): string {
  try {
    const asString = typeof body === 'string' ? body : JSON.stringify(body)
    if (asString.length > 5000) {
      return asString.slice(0, 5000) + '...[truncated]'
    }
    return asString
  } catch {
    return '[unserializable body]'
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  const url = new URL(req.url)

  const headerRunId = req.headers.get('x-rgpt-run-id') ?? undefined
  const queryRunId = url.searchParams.get('run_id') ?? undefined
  const runId = headerRunId ?? queryRunId ?? crypto.randomUUID()

  // Internal security check
  const internalKeyHeader = req.headers.get('x-rgpt-internal')

  if (INTERNAL_KEY) {
    if (!internalKeyHeader || internalKeyHeader !== INTERNAL_KEY) {
      console.warn('[ORCH-PLAN] Unauthorized access attempt.', {
        route: '/api/orchestrator/plan',
        runId,
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized orchestrator access.',
          route: '/api/orchestrator/plan',
          runId,
        },
        { status: 401 },
      )
    }
  } else {
    console.warn(
      '[ORCH-PLAN] RGPT_INTERNAL_KEY is not set. Route is running without header enforcement.',
    )
  }

  return withOrchestratorHandler({ route: '/api/orchestrator/plan', runId }, async () => {
    const body = (await req.json().catch(() => ({}))) as any

    console.log('[ORCH-PLAN] Incoming request', {
      route: '/api/orchestrator/plan',
      runId,
      bodySummary: summarizeBody(body),
    })

    const plannerBody = {
      ...body,
      run_id: runId,
    }

    const plannerUrl = `${INTERNAL_BASE_URL}/api/planner`

    const res = await fetch(plannerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(INTERNAL_KEY ? { 'x-rgpt-internal': INTERNAL_KEY } : {}),
      },
      body: JSON.stringify(plannerBody),
    })

    const text = await res.text()
    let json: any = null

    try {
      json = text ? JSON.parse(text) : null
    } catch {
      // Not valid JSON, keep raw text
    }

    console.log('[ORCH-PLAN] Planner response', {
      route: '/api/orchestrator/plan',
      runId,
      status: res.status,
      ok: res.ok,
      bodySummary: summarizeBody(json ?? text),
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Planner call failed.',
          route: '/api/orchestrator/plan',
          runId,
          status: res.status,
          plannerRaw: json ?? text,
        },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Planner plan generated via orchestrator.',
        route: '/api/orchestrator/plan',
        runId,
        planner: json,
      },
      { status: 200 },
    )
  })
}
