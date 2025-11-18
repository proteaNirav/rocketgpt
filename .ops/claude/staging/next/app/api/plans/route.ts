export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServerClient();
  const { data, error } = await sb.from("rl_plans").select("*").order("monthly_price_inr");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const sb = getSupabaseServerClient();
  const body = await req.json();
  const { error } = await sb.from("rl_plans").upsert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}



