import { NextResponse } from "next/server";

export const config = {
  matcher: ["/account", "/profile"]
};

export function middleware(req) {
  const url = req.nextUrl.clone();
  const user = req.cookies.get("sb-access-token");

  if (!user) {
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
