import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // 1) Seed a guest_id cookie if missing (uses Web Crypto in Edge runtime)
  if (!req.cookies.get('guest_id')) {
    const guestId = crypto.randomUUID()
    res.cookies.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: true,
    })
  }

  // 2) Protect /account when not signed in (Supabase sets sb-* cookies when authed)
  if (req.nextUrl.pathname.startsWith('/account')) {
    const hasSession =
      req.cookies.get('sb-access-token') || req.cookies.get('sb-refresh-token')
    if (!hasSession) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  return res
}

// Apply to everything except Next internals and static assets.
// Adjust if you have other public folders.
export const config = {
  matcher: ['/((?!_next|favicon.ico|images|public).*)'],
}
