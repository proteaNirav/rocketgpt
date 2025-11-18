export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    // If env is missing, return a harmless payload (prevents build-time crashes)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: true, source: "usage", note: "supabase env missing" });
    }

    // Minimal ping to prove the client works; avoid heavy queries during build
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // Don’t fail the route for anonymous users; just report anonymous
      return NextResponse.json({ ok: true, source: "usage", user: null });
    }
    return NextResponse.json({ ok: true, source: "usage", user: user ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 200 });
  }
}
