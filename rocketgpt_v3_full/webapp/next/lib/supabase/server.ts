"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client factory (App Router safe).
 * NOTE: In a "use server" file, only async functions may be exported.
 */
export async function getSupabaseServerClient() {
  const cookieStore = cookies();
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const client = createServerClient(url, anon, {
    cookies: {
      getAll() {
        try { return cookieStore.getAll(); } catch { return []; }
      },
      // No-ops to avoid writes during server actions
      setAll(_cookies) { /* noop */ },
    },
  });

  return client;
}
