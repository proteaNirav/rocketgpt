"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Canonical server-side Supabase client factory (App Router).
 * Must be async in a `"use server"` file.
 */
export async function getSupabaseServerClient() {
  const cookieStore = cookies();
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return createServerClient(url, anon, {
    cookies: {
      // @supabase/ssr reads getAll() for cookie forwarding
      getAll() {
        return cookieStore.getAll();
      },
      // No-ops to avoid header mutation in App Router
      setAll(_cookies) { /* no-op */ },
    },
  });
}

/** Backward compatible alias for older imports */
export async function createSupabaseServerClient() {
  return getSupabaseServerClient();
}
