import { NextRequest, NextResponse } from "next/server";

// Gate /dashboard/* and /admin/* on the presence of the Go API's session
// cookie. The cookie is httpOnly so client JS can never read its value, but
// middleware runs server-side and CAN see the cookie (name + value) on the
// incoming request — we only check that it's present, not that it's valid.
// This is a cheap, fast redirect for the common case (no cookie at all).
// Actual validity is enforced by the API on every request regardless (every
// protected endpoint re-checks the session), so a forged/expired cookie that
// passes this presence check simply gets 401s from the API once the page
// tries to load data — no security is delegated to this middleware.
const SESSION_COOKIE = "session";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
