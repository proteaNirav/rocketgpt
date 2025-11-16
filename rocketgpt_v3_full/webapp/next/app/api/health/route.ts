import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  // Supabase basic ping (non-blocking)
  let supabase_ok = false;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from("_").select("*").limit(1);
    if (!error) supabase_ok = true;
  } catch (e) {
    supabase_ok = false;
  }

  return NextResponse.json(
    {
      ok: true,
      ts,
      build,
      supabase_ok
    },
    { status: 200 }
  );
}
