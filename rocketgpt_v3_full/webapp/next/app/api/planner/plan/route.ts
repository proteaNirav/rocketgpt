import { NextRequest, NextResponse } from 'next/server';
import { validatePlannerRequest, validatePlannerResponse } from '@/lib/planner/planner-validators';
import { runPlanner } from '@/lib/planner/planner-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const plannerReq = validatePlannerRequest(body);
    const plannerResp = await runPlanner(plannerReq);
    const safeResp = validatePlannerResponse(plannerResp);

    return NextResponse.json(safeResp, { status: 200 });
  } catch (err: any) {
    console.error('Planner API error:', err);

    const message =
      err && err.message ? err.message : 'Unexpected planner error.';

    return NextResponse.json(
      {
        error: 'PlannerError',
        message,
      },
      { status: 400 },
    );
  }
}
