import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServerClient();
  const { data, error } = await sb.from("v_rl_usage").select("*").limit(100);

  if (error) {
    console.error("Usage fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}


