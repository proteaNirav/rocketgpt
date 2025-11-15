'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  // This will run only on the server
  const cookieStore = cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // No-op to avoid Next.js cookie write restrictions in the app router
        async setAll(_cookiesToSet) {
          // intentionally left blank
        },
      },
    }
  )

  return client
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Minimal server-side client factory. Adjust keys to your env.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options?: any) { try { cookieStore.set({ name, value, ...options } as any); } catch {} },
      remove(name: string, options?: any) { try { cookieStore.set({ name, value: "", ...options, maxAge: 0 } as any); } catch {} },
    }
  });
}
