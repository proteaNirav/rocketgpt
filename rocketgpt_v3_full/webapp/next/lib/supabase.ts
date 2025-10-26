// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Lazily initialize a single Supabase client. */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('⚠️ Supabase environment variables missing')
    // Safe fallback for build
    return createClient('https://example.supabase.co', 'public-anon-key')
  }

  client = createClient(url, key)
  return client
}

/** Back-compat default export */
export const supabase = getSupabase()
