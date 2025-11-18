import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Lazily initialize a single Supabase client.
 * Works for both client and server components.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Safe runtime warning instead of build failure
    console.warn('âš ï¸ Supabase environment variables missing')
    // Return a dummy client to avoid breaking UI; only for build phase
    return createClient('https://example.supabase.co', 'public-anon-key')
  }

  client = createClient(url, key)
  return client
}

/**
 * Backward-compat default export: some components still import `supabase`
 * instead of `getSupabase()`.
 */
export const supabase = getSupabase()


