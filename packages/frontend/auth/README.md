# @dafne/frontend-auth

Authentication in the frontend, with the [Better Auth](https://www.better-auth.com)
client. Better Auth runs in `apps/auth` (`@dafne/backend-auth`), shared by
the apps; the frontend proxies `/api/auth/*` to it (`AUTH_URL`).

## Entry points

| Import                        | What                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `@dafne/frontend-auth`        | `SESSION_COOKIES`, `isAdmin`, `authErrorKey`, types `Session` / `User`           |
| `@dafne/frontend-auth/client` | `authClient` (sign in/up/out, update user…), `useAuthErrorMessage`               |
| `@dafne/frontend-auth/server` | `createSessionHelpers({ backendUrl, appUrl })` → `getCurrentUser`, `requireUser` |

The user's fields and plugins are inferred from the backend's options
(`@dafne/auth-options`, type only), so they can't drift.

## Usage

```ts
// apps/sales-web/lib/session.ts: created once
export const { getCurrentUser, requireUser } = createSessionHelpers({
  backendUrl: AUTH_URL, // apps/auth
  appUrl: APP_URL,
});

// a client component
const { error } = await authClient.signIn.email({ email, password });
```

`requireUser()` redirects to `/session-expired` (which clears the cookie,
then goes to sign-in) when there's no valid session.

Error texts are the app's messages: `auth.errors.*` and
`common.errors.generic`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-auth
pnpm nx typecheck @dafne/frontend-auth
```

There is no build: `apps/sales-web` compiles the sources (`transpilePackages`
in its `next.config.ts`).
