import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Server-side Supabase client (Next.js App Router).
 * It forwards the guest_id cookie as x-guest-id header for RLS on guest rows.
 */
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  const guestId = cookieStore.get('guest_id')?.value

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {}
      },
      global: {
        headers: { ...(guestId ? { 'x-guest-id': guestId } : {}) }
      }
    }
  )
}


