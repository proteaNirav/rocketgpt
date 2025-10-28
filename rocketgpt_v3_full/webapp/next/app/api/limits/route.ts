import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServerClient();

  const [{ data: usage }, { data: plans }] = await Promise.all([
    sb.from("v_rl_usage").select("*").order("last_call", { ascending: false }).limit(100),
    sb.from("rl_plans").select("*").order("monthly_price_inr"),
  ]);

  return NextResponse.json({ usage: usage ?? [], plans: plans ?? [] });
}

export async function POST(req: Request) {
  const sb = getSupabaseServerClient();
  const { user_id, plan_code } = await req.json().catch(() => ({}));
  if (!user_id || !plan_code) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Validate plan exists
  const { data: exists } = await sb.from("rl_plans").select("plan_code").eq("plan_code", plan_code).maybeSingle();
  if (!exists) return NextResponse.json({ error: "plan not found" }, { status: 400 });

  const { error } = await sb
    .from("rl_user_plans")
    .upsert({ user_id, plan_code, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
