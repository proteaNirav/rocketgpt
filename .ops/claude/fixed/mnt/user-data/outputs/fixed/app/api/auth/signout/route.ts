import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  const supabase = createSupabaseRouteHandlerClient();
  
  // Sign out the user
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("[auth/signout] Error signing out:", error);
  }

  // Redirect to home or specified URL
  return NextResponse.redirect(new URL(redirectTo, url));
}

export async function POST(req: Request) {
  return GET(req);
}
