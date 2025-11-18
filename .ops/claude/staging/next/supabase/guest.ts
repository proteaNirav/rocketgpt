import { cookies, headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Ensure a guest_id cookie exists and a corresponding row in public.guests.
 * Also updates last_seen via RPC on each call.
 */
export async function ensureGuest() {
  const jar = cookies()
  let guestId = jar.get('guest_id')?.value
  const supabase = createSupabaseServerClient()

  if (!guestId) {
    guestId = randomUUID()
    await supabase.from('guests').insert({ id: guestId })
    jar.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90 // 90 days
    })
  } else {
    await supabase.rpc('touch_guest', {
      p_guest_id: guestId,
      p_user_agent: headers().get('user-agent') ?? null
    })
  }

  return guestId
}


