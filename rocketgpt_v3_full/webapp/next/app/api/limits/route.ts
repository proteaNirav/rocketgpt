export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServerClient();

  const [usageRes, plansRes, userPlansRes] = await Promise.all([
    sb.from("v_rl_usage")
      .select("*")
      .order("last_call", { ascending: false })
      .limit(200),
    sb.from("rl_plans").select("*").order("monthly_price_inr"),
    sb.from("rl_user_plans").select("user_id, plan_code"),
  ]);

  const usage = usageRes.data ?? [];
  const plans = plansRes.data ?? [];
  const user_plans = userPlansRes.data ?? [];

  return NextResponse.json({ usage, plans, user_plans });
}

export async function POST(req: Request) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const sb = getSupabaseServerClient();
  const { user_id, plan_code } = await req.json().catch(() => ({}));

  if (!user_id || !plan_code) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // validate plan exists
  const { data: plan } = await sb
    .from("rl_plans")
    .select("plan_code")
    .eq("plan_code", plan_code)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "plan not found" }, { status: 400 });
  }

  const { error } = await sb
    .from("rl_user_plans")
    .upsert({ user_id, plan_code, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}



