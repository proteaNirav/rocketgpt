// For server-side use in Next.js (App Router)
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", expires: new Date(0), ...options });
        },
      },
    }
  );
}

// Backward-compat export (if your code calls createSupabaseServerClient)
export const createSupabaseServerClient = getSupabaseServerClient;


