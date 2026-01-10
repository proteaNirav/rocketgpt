export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import crypto from 'crypto'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { NextRequest, NextResponse } from 'next/server'
import { ensureRunDirs } from '@/lib/core-ai/run-folders'
import { writeDecisionEntry, writeDecisionOutcome } from '@/lib/core-ai/decision-ledger/writer'
export const runtime = 'nodejs'

const ROUTE = '/api/orchestrator/run/builder'
const ALLOWED = ['POST'] as const

type JsonObject = Record<string, unknown>

function nowIso() {
  return new Date().toISOString()
}

function json(status: number, body: JsonObject) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

async function safeLedgerEntry(entry: unknown) {
  try {
    await (writeDecisionEntry as any)(entry)
  } catch (e) {
    // Never block API response due to ledger write issues
    console.error('[builder/run] writeDecisionEntry failed:', e)
  }
}

async function safeLedgerOutcome(outcome: unknown) {
  try {
    await (writeDecisionOutcome as any)(outcome)
  } catch (e) {
    console.error('[builder/run] writeDecisionOutcome failed:', e)
  }
}

function methodNotAllowedPayload(runId: string, method: string | null) {
  return {
    success: false,
    route: ROUTE,
    runId,
    decision: 'METHOD_NOT_ALLOWED',
    allowed: [...ALLOWED],
    method,
    timestamp: nowIso(),
  }
}

function inputInvalidPayload(runId: string, reason: string) {
  return {
    success: false,
    route: ROUTE,
    runId,
    decision: 'INPUT_INVALID',
    reason,
    timestamp: nowIso(),
  }
}

export async function GET(req: NextRequest) {
  await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  const runId = crypto.randomUUID()
  const method = req.method ?? null

  await ensureRunDirs(runId)

  await safeLedgerEntry({
    runId,
    route: ROUTE,
    phase: 'builder',
    source: 'method-gate',
    non_bypassable: true,
    decision: 'METHOD_NOT_ALLOWED',
    allowed: [...ALLOWED],
    method,
    timestamp: nowIso(),
  })

  return json(405, methodNotAllowedPayload(runId, method))
}

export async function POST(req: NextRequest) {
  await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  const runId = crypto.randomUUID()
  const method = req.method ?? 'POST'

  await ensureRunDirs(runId)

  // Read body deterministically
  let raw = ''
  try {
    raw = await req.text()
  } catch (e) {
    await safeLedgerEntry({
      runId,
      route: ROUTE,
      phase: 'builder',
      source: 'body-read',
      non_bypassable: true,
      decision: 'INPUT_INVALID',
      reason: 'Failed to read request body.',
      method,
      timestamp: nowIso(),
    })
    return json(400, inputInvalidPayload(runId, 'Failed to read request body.'))
  }

  if (!raw || !raw.trim()) {
    await safeLedgerEntry({
      runId,
      route: ROUTE,
      phase: 'builder',
      source: 'input-guard',
      non_bypassable: true,
      decision: 'INPUT_INVALID',
      reason: 'Empty request body.',
      method,
      timestamp: nowIso(),
    })
    return json(400, inputInvalidPayload(runId, 'Empty request body.'))
  }

  let payload: any = null
  try {
    payload = JSON.parse(raw)
  } catch {
    await safeLedgerEntry({
      runId,
      route: ROUTE,
      phase: 'builder',
      source: 'input-guard',
      non_bypassable: true,
      decision: 'INPUT_INVALID',
      reason: 'Invalid JSON body.',
      method,
      timestamp: nowIso(),
    })
    return json(400, inputInvalidPayload(runId, 'Invalid JSON body.'))
  }

  // Ledger: accepted
  await safeLedgerEntry({
    runId,
    route: ROUTE,
    phase: 'builder',
    source: 'builder-run',
    non_bypassable: true,
    decision: 'ACCEPTED',
    method,
    timestamp: nowIso(),
  })

  // NOTE: This endpoint is the method+input deterministic surface.
  // If your builder execution pipeline exists elsewhere, wire it here
  // after this P4A1 gate is stable.
  const response = {
    success: true,
    route: ROUTE,
    runId,
    message: 'Builder run request accepted.',
    timestamp: nowIso(),
    received_keys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
  }

  await safeLedgerOutcome({
    runId,
    route: ROUTE,
    phase: 'builder',
    outcome: 'OK',
    status: 200,
    timestamp: nowIso(),
  })

  return json(200, response)
}
