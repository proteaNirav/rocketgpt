"use server"

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client factory (App Router safe).
 * Always dynamic (no static export), cookies are read-only.
 */
export async function getSupabaseServerClient() {
  const cookieStore = cookies();
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const client = createServerClient(url, anon, {
    cookies: {
      getAll() {
        // Next.js App Router: only read cookies server-side
        try { return cookieStore.getAll(); } catch { return []; }
      },
      // No-ops to avoid writes during server actions
      setAll(_cookies) { /* noop */ },
    },
  });

  return client;
}

// Hard-disable any prerendering attempts for imported modules
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
