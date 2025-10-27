import { createBrowserClient } from '@supabase/ssr'

// Singleton to avoid multiple GoTrueClient instances
let sb:
  | ReturnType<typeof createBrowserClient<{ [key: string]: any }>>
  | null = null

export const getSupabaseBrowserClient = (guestId?: string) => {
  if (sb) return sb
  sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { ...(guestId ? { 'x-guest-id': guestId } : {}) },
      },
    }
  )
  return sb
}
