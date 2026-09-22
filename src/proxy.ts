import { NextResponse, type NextRequest } from "next/server";

// The PIN gate (docs/06-pin-lock.md). Anything without the session cookie
// goes to /unlock. The cookie holds SESSION_SECRET, never the PIN. Next 16
// calls this file `proxy`, not `middleware`.
const COOKIE = "tt_session";
const OPEN = ["/unlock", "/api/unlock"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  if (secret && req.cookies.get(COOKIE)?.value === secret) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

// Everything except Next internals and static files.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
};
