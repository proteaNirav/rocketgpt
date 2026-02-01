// ============================================================================
//  RocketGPT Orchestrator Ã¢â‚¬â€œ Planner.Run API
//  PhaseB StepB7 Ã¢â‚¬â€œ Safe-Mode Hardened Implementation
// ============================================================================

import { NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { safeModeGuard } from '../../_core/safeMode'
import { runPlanner } from '../../_core/plannerEngine'
export const runtime = 'nodejs'

// ============================================================================
//  POST /api/orchestrator/planner/run
//  Description:
//    Executes the Planner agent to generate a plan from goal input.
//    Fully blocked when Safe-Mode is active.
// ============================================================================

export async function POST(req: Request) {
  await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  try {
    // Enforce Safe-Mode protection
    safeModeGuard('planner')

    const body = await req.json()
    const plannerResult = await runPlanner(body)

    return NextResponse.json({
      success: true,
      route: '/api/orchestrator/planner/run',
      planner: plannerResult,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    // Safe-Mode or planner failure
    return NextResponse.json(err, { status: 503 })
  }
}
