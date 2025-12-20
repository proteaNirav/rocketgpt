export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// webapp/next/app/api/debug-auth/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
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



