import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: [
    // Protected routes
    "/account/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/super/:path*",
    // Auth routes
    "/auth/callback",
    "/login",
  ]
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();
  
  // Create Supabase client with cookie handling for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          // Set cookie on both request and response
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          // Remove cookie from both request and response
          req.cookies.set({ name, value: '', ...options, maxAge: 0 });
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Refresh session if it exists (handles token refresh)
  const { data: { user }, error } = await supabase.auth.getUser();

  // Protected routes check
  const isProtectedRoute = 
    url.pathname.startsWith('/account') || 
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/super');

  const isAuthRoute = 
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/auth');

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && (!user || error)) {
    console.log('[middleware] Redirecting unauthenticated user from:', url.pathname);
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (isAuthRoute && user && !error && url.pathname === '/login') {
    // Check if there's a redirect target
    const redirectedFrom = url.searchParams.get('redirectedFrom');
    const next = url.searchParams.get('next');
    const redirectTo = redirectedFrom || next || '/account';
    
    console.log('[middleware] Redirecting authenticated user to:', redirectTo);
    return NextResponse.redirect(new URL(redirectTo, url));
  }

  return res;
}
