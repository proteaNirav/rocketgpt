export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { runTesterEngine } from '../testerEngine'
export const runtime = 'nodejs'

const ROUTE = '/api/tester/run'

function normalizeError(err: unknown): { message: string; name?: string } {
  if (err instanceof Error) {
    return { message: err.message || 'Unexpected error', name: err.name }
  }
  if (typeof err === 'string') {
    return { message: err }
  }
  try {
    return { message: JSON.stringify(err) }
  } catch {
    return { message: 'Unexpected error' }
  }
}

function guardFailResponse(err: any, runId?: string): NextResponse {
  const message = typeof err?.message === 'string' ? err.message : 'Runtime guard blocked request.'
  const statusFromError = typeof err?.status === 'number' ? err.status : undefined
  const status =
    statusFromError === 400 || statusFromError === 401 || statusFromError === 403
      ? statusFromError
      : message.startsWith('RGPT_GUARD_BLOCK:')
        ? 403
        : message.includes('MISSING_DECISION_ID')
          ? 400
          : 403
  const error_code = message.includes('MISSING_DECISION_ID')
    ? 'MISSING_DECISION_ID'
    : message.startsWith('RGPT_GUARD_BLOCK:')
      ? 'RGPT_GUARD_BLOCK'
      : 'RUNTIME_GUARD_FAILED'

  return NextResponse.json(
    {
      success: false,
      route: ROUTE,
      runId: runId ?? null,
      error_code,
      message,
      ...(err?.details !== undefined ? { details: err.details } : {}),
    },
    { status },
  )
}

export async function POST(req: NextRequest) {
  const bodyForRunId = await req
    .clone()
    .json()
    .catch(() => ({}) as any)
  const runIdFromRequest = typeof bodyForRunId?.runId === 'string' ? bodyForRunId.runId : undefined
  try {
    await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  } catch (err: any) {
    return guardFailResponse(err, runIdFromRequest)
  }

  const origin = new URL(req.url).origin
  const baseUrl = process.env.INTERNAL_BASE_URL?.trim()
    ? process.env.INTERNAL_BASE_URL.trim()
    : origin

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const profileId: string = body?.profile || 'base'
  const goal: string = body?.goal || 'Orchestrator \u2192 Tester HTTP status + profile test'
  const runId: string | undefined = body?.runId || undefined

  try {
    const result = await runTesterEngine(profileId, goal, runId, baseUrl)
    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    const normalized = normalizeError(err)
    return NextResponse.json(
      {
        success: false,
        route: ROUTE,
        runId: runId ?? null,
        error_code: 'TESTER_RUN_FAILED',
        message: 'Tester run failed',
        details: normalized,
      },
      { status: 500 },
    )
  }
}
