import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  console.log("[auth/callback] Processing", { 
    hasCode: !!code, 
    next, 
    error,
    error_description 
  });

  // Handle OAuth errors (e.g., user denied access)
  if (error) {
    console.error("[auth/callback] OAuth error:", error, error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, url)
    );
  }

  if (!code) {
    console.error("[auth/callback] No code in URL");
    return NextResponse.redirect(new URL("/login?error=no_code", url));
  }

  try {
    // Use Route Handler specific client that can write cookies
    const supabase = createSupabaseRouteHandlerClient();

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("[auth/callback] Exchange error:", exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url)
      );
    }

    if (!data?.session) {
      console.error("[auth/callback] No session after exchange");
      return NextResponse.redirect(
        new URL("/login?error=no_session", url)
      );
    }

    console.log("[auth/callback] Session established for:", data.session.user.email);

    // Handle guest data migration if needed
    const response = NextResponse.redirect(new URL(next, url));
    
    // Get guest_id cookie to potentially migrate data
    const guestId = req.headers.get('cookie')?.match(/guest_id=([^;]+)/)?.[1];
    
    if (guestId) {
      try {
        // Migrate guest data to authenticated user
        await supabase.rpc('migrate_guest_data', { 
          p_guest_id: guestId 
        });
        
        // Clear guest cookie after migration
        response.cookies.set('guest_id', '', {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
        });
        
        console.log("[auth/callback] Migrated guest data:", guestId);
      } catch (migrationError) {
        // Log but don't fail the auth flow
        console.error("[auth/callback] Guest migration error:", migrationError);
      }
    }

    return response;
  } catch (err: any) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err?.message || 'callback_error')}`, url)
    );
  }
}
