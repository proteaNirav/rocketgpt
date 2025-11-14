import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // 1Ã¯Â¸ÂÃ¢Æ’Â£ Ensure guest_id cookie
  const hasGuest = req.cookies.get("guest_id")?.value;
  if (!hasGuest) {
    const res = NextResponse.next();
    const id = crypto.randomUUID();
    console.log("guest_id created:", id);
    res.cookies.set("guest_id", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return res; // early return
  }

  // 2Ã¯Â¸ÂÃ¢Æ’Â£ Protect /account (redirect to /login if not signed in)
  if (req.nextUrl.pathname.startsWith("/account")) {
    const hasSession =
      req.cookies.get("sb-access-token") || req.cookies.get("sb-refresh-token");
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Ã°Å¸""ž Apply middleware everywhere except Next internals & API routes
export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|images|public|api).*)",
  ],
};


