"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Canonical server-side Supabase client factory for App Router.
 * Must be async in a `"use server"` file to satisfy Next.js server actions rules.
 */
export async function getSupabaseServerClient() {
  const cookieStore = cookies();
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Return the SSR client bound to Next cookies; we no-op writes to avoid header mutations.
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      // No-ops to satisfy the interface without mutating headers in App Router
      set() { /* no-op */ },
      remove() { /* no-op */ }
    }
  });
}

/** Backward compatible alias if older code imports this name */
export async function createSupabaseServerClient() {
  return getSupabaseServerClient();
}
