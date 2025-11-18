import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  console.log("[auth/callback] hit", { hasCode: !!code, next });

  // Construct client (Node runtime)
  const supabase = createSupabaseServerClient();
  console.log("[auth/callback] client ready");

  if (code) {
    try {
      console.time("[auth/callback] exchange");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      console.timeEnd("[auth/callback] exchange");
      console.log("[auth/callback] exchange result", { hasSession: !!data?.session, error: error?.message });

      if (error) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));
      }
      return NextResponse.redirect(new URL(next, url));
    } catch (e: any) {
      console.log("[auth/callback] exception", e?.message || e);
      return NextResponse.redirect(new URL(`/login?error=callback`, url));
    }
  }

  console.log("[auth/callback] no code in URL");
  return NextResponse.redirect(new URL("/login?error=nocode", url));
}
