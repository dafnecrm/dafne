# @dafne/backend-auth

Authentication with [Better Auth](https://www.better-auth.com), mounted in
Nest by `@thallesp/nestjs-better-auth` under `/api/auth/*`. It runs in
**`apps/auth`** only, on the `auth` schema (`@dafne/backend-database-auth`):
the apps' APIs check sessions through `@dafne/backend-session`. The
frontends call it through their own origin (they proxy `/api/auth`), so
the session cookies (`dafne.session_token`) belong to them, or to the
parent domain with `COOKIE_DOMAIN`.

## Contents

- `AuthModule`: Better Auth on the auth schema, with the admin plugin, email
  verification (sent with Resend, in the user's language), the apps of
  the user in the session (`customSession`: `user.apps`, from
  `app_access`) and the default apps for new users (`DEFAULT_APPS`).
- `AuthService`: `createUser`, `sendVerificationEmail`. On startup, after
  the migrations, it creates the admin user from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`.
- `createAuth` (`auth.ts`): the Better Auth instance.
- The options that don't depend on the database or the environment (user
  fields, plugins) are in `@dafne/auth-options` (`packages/auth-options`),
  shared with the frontend, which imports their type.

## Configuration

Read from `apps/auth/.env` (see `.env.example`):

| Variable                        |                                              |
| ------------------------------- | -------------------------------------------- |
| `BETTER_AUTH_SECRET`            | required                                     |
| `AUTH_ALLOWED_HOSTS`            | the frontends' hosts (wildcards allowed): each request's email links go back to its own |
| `DEV_AUTH_ALLOWED_HOSTS`        | set by `dafne dev`: the hosts its proxy serves |
| `BETTER_AUTH_URL`               | public URL in email links: a frontend (the fallback with `AUTH_ALLOWED_HOSTS`) |
| `TRUSTED_ORIGINS`               | comma-separated, other origins allowed (the allowed hosts already are) |
| `RESEND_API_KEY`                | required, for the verification emails        |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the admin created on startup                 |
| `COOKIE_DOMAIN`                 | parent domain of the apps (shared sign-in)   |
| `DEFAULT_APPS`                  | apps a new user gets, e.g. `sales`             |

## Auth tables

`pnpm --filter @dafne/backend-auth auth:schema:generate` regenerates
Better Auth's tables in `@dafne/backend-database-auth` (`src/better-auth.ts`,
then `tables:schema` moves them into the auth schema). Then `pnpm dafne db generate @dafne/backend-database-auth`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-auth
pnpm nx lint @dafne/backend-auth
pnpm nx typecheck @dafne/backend-auth
```
