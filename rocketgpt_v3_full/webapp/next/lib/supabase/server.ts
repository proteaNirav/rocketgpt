import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client.
 * Read cookies normally; swallow cookie writes when we're not in a Server Action/Route Handler
 * to avoid: "Cookies can only be modified in a Server Action or Route Handler".
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const safeSet = (name: string, value: string, options: any) => {
    try { cookieStore.set({ name, value, ...options }); } catch { /* no-op outside actions/handlers */ }
  };
  const safeRemove = (name: string, options: any) => {
    try { cookieStore.set({ name, value: "", ...options, maxAge: 0 }); } catch { /* no-op */ }
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set: safeSet,
        remove: safeRemove,
      },
    }
  );
}

export default createSupabaseServerClient;
// Legacy alias for older imports
export { createSupabaseServerClient as getSupabaseServerClient };
