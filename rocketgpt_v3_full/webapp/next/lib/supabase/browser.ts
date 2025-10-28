// For client-side (browser) use in Next.js (App Router)
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Backward-compat export (if your code calls createSupabaseBrowserClient)
export const createSupabaseBrowserClient = getSupabaseBrowserClient;


