# RocketGPT Auth Fix - Unified Diff Patches

## 1. lib/supabase/server.ts
```diff
--- a/lib/supabase/server.ts
+++ b/lib/supabase/server.ts
@@ -1,36 +1,93 @@
-import { cookies } from "next/headers";
-import { createServerClient } from "@supabase/ssr";
+import { cookies } from "next/headers";
+import { createServerClient, type CookieOptions } from "@supabase/ssr";
 
 /**
- * Server-side Supabase client.
- * Read cookies normally; swallow cookie writes when we're not in a Server Action/Route Handler
- * to avoid: "Cookies can only be modified in a Server Action or Route Handler".
+ * Creates a Supabase client for server-side use (App Router).
+ * Properly handles cookies in both Server Components and Route Handlers/Actions.
+ * 
+ * @param options - Additional options for the client
+ * @param options.serviceRole - Use service role key instead of anon key
+ * @param options.cookieOptions - Override cookie options
  */
-export function createSupabaseServerClient() {
+export function createSupabaseServerClient(options?: {
+  serviceRole?: boolean;
+  cookieOptions?: Partial<CookieOptions>;
+}) {
   const cookieStore = cookies();
-
-  const safeSet = (name: string, value: string, options: any) => {
-    try { cookieStore.set({ name, value, ...options }); } catch { /* no-op outside actions/handlers */ }
-  };
-  const safeRemove = (name: string, options: any) => {
-    try { cookieStore.set({ name, value: "", ...options, maxAge: 0 }); } catch { /* no-op */ }
-  };
 
   return createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
-    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
+    options?.serviceRole 
+      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
+      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     {
       cookies: {
         get(name: string) {
           return cookieStore.get(name)?.value;
         },
-        set: safeSet,
-        remove: safeRemove,
+        set(name: string, value: string, options: CookieOptions) {
+          try {
+            cookieStore.set({ 
+              name, 
+              value, 
+              ...options,
+              // Ensure secure cookies in production
+              secure: process.env.NODE_ENV === 'production',
+            });
+          } catch (error) {
+            // This error is expected in Server Components (non-Route Handler/Action context)
+            // The Supabase client will still work for read operations
+          }
+        },
+        remove(name: string, options: CookieOptions) {
+          try {
+            cookieStore.set({ 
+              name, 
+              value: '', 
+              ...options,
+              maxAge: 0 
+            });
+          } catch (error) {
+            // Expected in Server Components
+          }
+        },
       },
     }
   );
 }
 
+/**
+ * Creates a Supabase client specifically for Route Handlers.
+ * This version ensures cookies can be written properly.
+ */
+export function createSupabaseRouteHandlerClient() {
+  const cookieStore = cookies();
+
+  return createServerClient(
+    process.env.NEXT_PUBLIC_SUPABASE_URL!,
+    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
+    {
+      cookies: {
+        get(name: string) {
+          return cookieStore.get(name)?.value;
+        },
+        set(name: string, value: string, options: CookieOptions) {
+          cookieStore.set({ 
+            name, 
+            value, 
+            ...options,
+            secure: process.env.NODE_ENV === 'production',
+          });
+        },
+        remove(name: string, options: CookieOptions) {
+          cookieStore.set({ 
+            name, 
+            value: '', 
+            ...options,
+            maxAge: 0 
+          });
+        },
+      },
+    }
+  );
+}
+
+// Backward compatibility exports
 export default createSupabaseServerClient;
-// Legacy alias for older imports
 export { createSupabaseServerClient as getSupabaseServerClient };
```

## 2. middleware.ts
```diff
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,18 +1,68 @@
 import { NextResponse } from "next/server";
+import type { NextRequest } from "next/server";
+import { createServerClient } from "@supabase/ssr";
 
 export const config = {
-  matcher: ["/account", "/profile"]
+  matcher: [
+    // Protected routes
+    "/account/:path*",
+    "/profile/:path*",
+    "/admin/:path*",
+    "/super/:path*",
+    // Auth routes
+    "/auth/callback",
+    "/login",
+  ]
 };
 
-export function middleware(req) {
+export async function middleware(req: NextRequest) {
+  const res = NextResponse.next();
   const url = req.nextUrl.clone();
-  const user = req.cookies.get("sb-access-token");
+  
+  // Create Supabase client with cookie handling for middleware
+  const supabase = createServerClient(
+    process.env.NEXT_PUBLIC_SUPABASE_URL!,
+    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
+    {
+      cookies: {
+        get(name: string) {
+          return req.cookies.get(name)?.value;
+        },
+        set(name: string, value: string, options) {
+          // Set cookie on both request and response
+          req.cookies.set({ name, value, ...options });
+          res.cookies.set({ name, value, ...options });
+        },
+        remove(name: string, options) {
+          // Remove cookie from both request and response
+          req.cookies.set({ name, value: '', ...options, maxAge: 0 });
+          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
+        },
+      },
+    }
+  );
 
-  if (!user) {
+  // Refresh session if it exists (handles token refresh)
+  const { data: { user }, error } = await supabase.auth.getUser();
+
+  // Protected routes check
+  const isProtectedRoute = 
+    url.pathname.startsWith('/account') || 
+    url.pathname.startsWith('/profile') ||
+    url.pathname.startsWith('/admin') ||
+    url.pathname.startsWith('/super');
+
+  const isAuthRoute = 
+    url.pathname.startsWith('/login') || 
+    url.pathname.startsWith('/auth');
+
+  // Redirect unauthenticated users from protected routes
+  if (isProtectedRoute && (!user || error)) {
+    console.log('[middleware] Redirecting unauthenticated user from:', url.pathname);
     url.pathname = "/login";
     url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
     return NextResponse.redirect(url);
   }
 
-  return NextResponse.next();
+  // Redirect authenticated users away from login
+  if (isAuthRoute && user && !error && url.pathname === '/login') {
+    // Check if there's a redirect target
+    const redirectedFrom = url.searchParams.get('redirectedFrom');
+    const next = url.searchParams.get('next');
+    const redirectTo = redirectedFrom || next || '/account';
+    
+    console.log('[middleware] Redirecting authenticated user to:', redirectTo);
+    return NextResponse.redirect(new URL(redirectTo, url));
+  }
+
+  return res;
 }
```

## 3. app/auth/callback/route.ts
```diff
--- a/app/auth/callback/route.ts
+++ b/app/auth/callback/route.ts
@@ -1,5 +1,5 @@
 import { NextResponse } from "next/server";
-import { createSupabaseServerClient } from "@/lib/supabase/server";
+import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
 
 export const runtime = "nodejs";
 export const dynamic = "force-dynamic";
@@ -9,29 +9,74 @@ export async function GET(req: Request) {
   const url = new URL(req.url);
   const code = url.searchParams.get("code");
   const next = url.searchParams.get("next") || "/account";
+  const error = url.searchParams.get("error");
+  const error_description = url.searchParams.get("error_description");
 
-  console.log("[auth/callback] hit", { hasCode: !!code, next });
+  console.log("[auth/callback] Processing", { 
+    hasCode: !!code, 
+    next, 
+    error,
+    error_description 
+  });
 
-  // Construct client (Node runtime)
-  const supabase = createSupabaseServerClient();
-  console.log("[auth/callback] client ready");
+  // Handle OAuth errors (e.g., user denied access)
+  if (error) {
+    console.error("[auth/callback] OAuth error:", error, error_description);
+    return NextResponse.redirect(
+      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, url)
+    );
+  }
+
+  if (!code) {
+    console.error("[auth/callback] No code in URL");
+    return NextResponse.redirect(new URL("/login?error=no_code", url));
+  }
 
-  if (code) {
-    try {
-      console.time("[auth/callback] exchange");
-      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
-      console.timeEnd("[auth/callback] exchange");
-      console.log("[auth/callback] exchange result", { hasSession: !!data?.session, error: error?.message });
+  try {
+    // Use Route Handler specific client that can write cookies
+    const supabase = createSupabaseRouteHandlerClient();
 
-      if (error) {
-        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));
+    // Exchange the code for a session
+    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
+    
+    if (exchangeError) {
+      console.error("[auth/callback] Exchange error:", exchangeError);
+      return NextResponse.redirect(
+        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url)
+      );
+    }
+
+    if (!data?.session) {
+      console.error("[auth/callback] No session after exchange");
+      return NextResponse.redirect(
+        new URL("/login?error=no_session", url)
+      );
+    }
+
+    console.log("[auth/callback] Session established for:", data.session.user.email);
+
+    // Handle guest data migration if needed
+    const response = NextResponse.redirect(new URL(next, url));
+    
+    // Get guest_id cookie to potentially migrate data
+    const guestId = req.headers.get('cookie')?.match(/guest_id=([^;]+)/)?.[1];
+    
+    if (guestId) {
+      try {
+        // Migrate guest data to authenticated user
+        await supabase.rpc('migrate_guest_data', { 
+          p_guest_id: guestId 
+        });
+        
+        // Clear guest cookie after migration
+        response.cookies.set('guest_id', '', {
+          httpOnly: true,
+          sameSite: 'lax',
+          path: '/',
+          maxAge: 0,
+          secure: process.env.NODE_ENV === 'production',
+        });
+        
+        console.log("[auth/callback] Migrated guest data:", guestId);
+      } catch (migrationError) {
+        // Log but don't fail the auth flow
+        console.error("[auth/callback] Guest migration error:", migrationError);
       }
-      return NextResponse.redirect(new URL(next, url));
-    } catch (e: any) {
-      console.log("[auth/callback] exception", e?.message || e);
-      return NextResponse.redirect(new URL(`/login?error=callback`, url));
     }
-  }
 
-  console.log("[auth/callback] no code in URL");
-  return NextResponse.redirect(new URL("/login?error=nocode", url));
+    return response;
+  } catch (err: any) {
+    console.error("[auth/callback] Unexpected error:", err);
+    return NextResponse.redirect(
+      new URL(`/login?error=${encodeURIComponent(err?.message || 'callback_error')}`, url)
+    );
+  }
 }
```

## 4. Remove duplicate Supabase client files
```bash
# Remove conflicting duplicate files
rm -f supabase/server.ts
rm -f supabase/browser.ts
rm -f supabase/guest.ts

# Keep only the files in lib/supabase/
```
