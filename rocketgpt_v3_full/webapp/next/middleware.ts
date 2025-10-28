import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // 1️⃣ Always create guest_id if missing
  if (!req.cookies.get('guest_id')) {
    const guestId = crypto.randomUUID()
    res.cookies.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: process.env.NODE_ENV === 'production' ? true : false, // only secure in prod
    })
    console.log('guest_id created:', guestId)
  }

  // 2️⃣ Protect /account when not signed in
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

// 🔄 Apply middleware everywhere (including /login)
export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml|images|public|api).*)'],
}
