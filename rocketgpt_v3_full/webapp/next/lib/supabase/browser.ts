import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client.
 * Optionally pass guestId if you want to attach it as x-guest-id header.
 * (We’ll read the cookie directly in pages, so param is optional.)
 */
export const createSupabaseBrowserClient = (guestId?: string) =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { ...(guestId ? { 'x-guest-id': guestId } : {}) }
      }
    }
  )
