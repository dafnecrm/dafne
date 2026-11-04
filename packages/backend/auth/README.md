# @dafne/backend-auth

Authentication with [Better Auth](https://www.better-auth.com), mounted in
Nest by `@thallesp/nestjs-better-auth` under `/api/auth/*`. The frontend
calls it through its own origin (it proxies `/api/auth`), so the session
cookies (`dafne.session_token`) belong to the frontend.

## Contents

- `AuthModule`: Better Auth on the Drizzle database, with the admin plugin
  and email verification (sent with Resend, in the user's language).
- `AuthService`: `createUser`, `sendVerificationEmail`. On startup, after
  the migrations, it creates the admin user from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`.
- `createAuth` (`auth.ts`): the Better Auth instance.
- `./options` (`auth.options.ts`): the options that don't depend on the
  database or the environment (user fields, plugins). The frontend imports
  its **type** to infer the user fields (`@dafne/frontend-auth`), so it must
  stay free of Nest and of the other backend packages.

## Configuration

Read from `apps/api/.env`:

| Variable                        |                                              |
| ------------------------------- | -------------------------------------------- |
| `BETTER_AUTH_SECRET`            | required                                     |
| `BETTER_AUTH_URL`               | public URL used in email links: the frontend |
| `TRUSTED_ORIGINS`               | comma-separated, must include the frontend   |
| `RESEND_API_KEY`                | required, for the verification emails        |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the admin created on startup                 |

## Auth tables

`pnpm --filter @dafne/backend-auth auth:schema:generate` regenerates the
Drizzle tables (`@dafne/backend-database`, `tables/auth.ts`) from
`auth.cli.ts`. Then generate a migration in `apps/api`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-auth
pnpm nx lint @dafne/backend-auth
pnpm nx typecheck @dafne/backend-auth
```
