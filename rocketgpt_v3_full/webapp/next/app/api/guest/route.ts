export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(_req: NextRequest) {
  await runtimeGuard(_req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  try {
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

    const { error } = await supabase.from('guests').insert({ id: guestId })
    if (error && !/duplicate key/i.test(error.message)) {
      // capture but still return 200 so client can proceed
      Sentry.captureException(error, { tags: { route: '/api/guest' } })
      console.error('guest insert error:', error)
    }

    return res
  } catch (err) {
    Sentry.captureException(err, { tags: { route: '/api/guest' } })
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}



