import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@dafne/frontend-auth";
import { APP_URL, AUTH_URL } from "@dafne/frontend-api/server";
import { getCurrentUser } from "@/lib/session";

/**
 * A redirect within this app. The Location is relative: behind the dev
 * proxy (or any proxy), request.url holds the address Next listens on
 * (localhost:4000), not the one the browser used.
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { location: path } });
}

/**
 * Clears a session cookie the backend no longer accepts (expired, revoked,
 * database reset), then goes to sign-in. Pages can't delete cookies, and the
 * proxy treats any session cookie as signed in, so without this the two
 * would redirect to each other forever.
 */
export async function GET(request: NextRequest) {
  // Only clear an invalid session, so a link here can't sign anyone out.
  if (await getCurrentUser()) {
    return redirectTo("/");
  }

  const res = redirectTo("/sign-in");
  // Cookies of this host alone (set without COOKIE_DOMAIN). First: each
  // res.cookies change rewrites every Set-Cookie header from its own list,
  // which would drop those appended below.
  for (const name of SESSION_COOKIES) {
    res.cookies.delete(name);
  }
  // apps/auth's sign-out clears the cookie as it set it (name, Domain with
  // COOKIE_DOMAIN, Secure), even for a session it no longer has.
  try {
    const signOut = await fetch(`${AUTH_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        origin: APP_URL,
        "content-type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
    for (const cookie of signOut.headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
  } catch {
    // apps/auth unreachable: the host's own cookies above still go.
  }
  return res;
}
