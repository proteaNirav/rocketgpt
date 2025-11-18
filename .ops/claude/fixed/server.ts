import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side use (App Router).
 * Properly handles cookies in both Server Components and Route Handlers/Actions.
 * 
 * @param options - Additional options for the client
 * @param options.serviceRole - Use service role key instead of anon key
 * @param options.cookieOptions - Override cookie options
 */
export function createSupabaseServerClient(options?: {
  serviceRole?: boolean;
  cookieOptions?: Partial<CookieOptions>;
}) {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    options?.serviceRole 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              // Ensure secure cookies in production
              secure: process.env.NODE_ENV === 'production',
            });
          } catch (error) {
            // This error is expected in Server Components (non-Route Handler/Action context)
            // The Supabase client will still work for read operations
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              maxAge: 0 
            });
          } catch (error) {
            // Expected in Server Components
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client specifically for Route Handlers.
 * This version ensures cookies can be written properly.
 */
export function createSupabaseRouteHandlerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            secure: process.env.NODE_ENV === 'production',
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            maxAge: 0 
          });
        },
      },
    }
  );
}

// Backward compatibility exports
export default createSupabaseServerClient;
export { createSupabaseServerClient as getSupabaseServerClient };
