export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// webapp/next/app/api/debug-auth/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";


export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const cookieStore = cookies();
  const guestId = cookieStore.get("guest_id")?.value ?? null;

  const sb = getSupabaseServerClient();
  const { data } = await sb.auth.getUser();
  const userId = data.user?.id ?? null;

  const computedUid = userId ?? guestId ?? "guest";

  return NextResponse.json({
    userId,
    guestId,
    computedUid,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  });
}



