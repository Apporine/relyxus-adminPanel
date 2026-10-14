import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/session";

/**
 * Sign in comes first: console pages need a session, and a signed-in visit to the sign
 * in pages goes to the console. An optimistic check only; the Control API authorizes
 * every request once it exists.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const onSignIn = pathname === "/sign-in" || pathname.startsWith("/sign-in/");

  if (!signedIn && !onSignIn) {
    const url = new URL("/sign-in", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && onSignIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js assets, the favicon and the health check.
  matcher: ["/((?!_next/|favicon.ico|api/health).*)"],
};
