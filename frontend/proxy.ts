import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/lib/auth-cookies";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];
/** Clears an invalid session cookie; must run with or without a cookie. */
const SESSION_EXPIRED_PATH = "/session-expired";

/**
 * Quick redirect based on whether a session cookie exists. The session is
 * still validated by the backend when a protected page renders.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === SESSION_EXPIRED_PATH) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
