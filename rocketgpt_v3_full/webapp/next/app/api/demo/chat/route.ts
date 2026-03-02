import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/demo/chat
 * Phase-1: Returns a stub reply. Always 200, never 500.
 * Real LLM integration will be wired in a future phase.
 *
 * Response schema (stable):
 * { ok: true, mode: "demo", reply: string, usage: null, error: null }
 */
export async function POST() {
  // Phase-1: Return stub reply with stable schema - never 500
  const reply =
    "Hello! I'm RocketGPT running in Phase-1 demo mode. " +
    'Full chat functionality will be enabled soon. ' +
    'For now, this is a placeholder response.'

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    reply,
    usage: null,
    error: null,
  })
}
