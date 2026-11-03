import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIES } from "@/lib/auth-cookies";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/verify-email"];
/** Clears an invalid session cookie; must run with or without a cookie. */
const SESSION_EXPIRED_PATH = "/session-expired";

/**
 * Picks the locale (cookie, then Accept-Language) and rewrites /customers to
 * /<locale>/customers. The URL in the browser doesn't change.
 */
const intl = createMiddleware(routing);

/**
 * Quick redirect based on whether a session cookie exists. The session is
 * still validated by the backend when a protected page renders.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Route handlers outside app/[locale]: no locale rewrite.
  if (pathname === SESSION_EXPIRED_PATH) return NextResponse.next();
  // Better Auth's API, proxied to the backend (next.config.ts).
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return intl(request);
}

export const config = {
  // Skip Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
