import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase() {
  if (client) return client
  // Read at call-time (client/browser), not at build-time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Don’t throw at build — just log; components should guard usage on the client.
    console.error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    // Return a dummy client? Safer is to return null and let callers skip.
    return null as unknown as SupabaseClient
  }
  client = createClient(url, key)
  return client
}
