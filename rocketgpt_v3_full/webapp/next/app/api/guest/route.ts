import { NextRequest, NextResponse } from 'next/server'
import { withSentry } from '@sentry/nextjs'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function postHandler(_req: NextRequest) {
  const cookieStore = cookies()
  let guestId = cookieStore.get('guest_id')?.value

  // Prepare response we can attach cookies to
  const res = NextResponse.json({ ok: true })

  // 1) Ensure cookie
  if (!guestId) {
    guestId = crypto.randomUUID()
    res.cookies.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: process.env.NODE_ENV === 'production',
    })
  }

  // 2) Ensure guest row (idempotent insert)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
      global: { headers: { 'x-guest-id': guestId! } },
    }
  )

  // Insert if not existing (ignore duplicate errors)
  const { error } = await supabase.from('guests').insert({ id: guestId })
  if (error && !/duplicate key/i.test(error.message)) {
    // Let Sentry see it; still return 200 so client continues gracefully
    console.error('guest insert error:', error)
  }

  return res
}

// ✅ correct export (outside the function)
export const POST = withSentry(postHandler, 'api-guest-post')
