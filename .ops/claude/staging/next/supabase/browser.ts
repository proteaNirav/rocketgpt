import { createBrowserClient } from '@supabase/ssr'

// Singleton client to avoid "Multiple GoTrueClient instances..." warning
let _client:
  | ReturnType<typeof createBrowserClient<{ [key: string]: any }>>
  | null = null

export const getSupabaseBrowserClient = (guestId?: string) => {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { ...(guestId ? { 'x-guest-id': guestId } : {}) },
      },
    }
  )
  return _client
}

// Ã¢Å“... Back-compat alias (deprecated): some files may still import/call the old name
export const createSupabaseBrowserClient = (guestId?: string) =>
  getSupabaseBrowserClient(guestId)


