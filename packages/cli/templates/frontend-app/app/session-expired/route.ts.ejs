import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@dafne/frontend-auth";
import { getCurrentUser } from "@/lib/session";

/**
 * Clears a session cookie the backend no longer accepts (expired, revoked,
 * database reset), then goes to sign-in. Pages can't delete cookies, and the
 * proxy treats any session cookie as signed in, so without this the two
 * would redirect to each other forever.
 */
export async function GET(request: NextRequest) {
  // Only clear an invalid session, so a link here can't sign anyone out.
  if (await getCurrentUser()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const res = NextResponse.redirect(new URL("/sign-in", request.url));
  for (const name of SESSION_COOKIES) res.cookies.delete(name);
  return res;
}
