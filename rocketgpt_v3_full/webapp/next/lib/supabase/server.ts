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
