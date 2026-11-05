[← Index](README.md)

# Architecture

Dafne is a family of apps that share sign-in and users. Each app has a
frontend (Next.js), an API (NestJS) and its own schema in the Postgres
database. One service,
`apps/auth`, handles sign-in for all of them.

```
browser ──► sales-web ──/api/auth/*──► apps/auth ──► auth schema
                    └─ data ───────► sales-api ──► sales schema (FK → auth.user)
                                       └─ session? ─► apps/auth
```

## Shared sign-in: `apps/auth`

- Runs [Better Auth](https://www.better-auth.com) under `/api/auth/*`, the
  users API (`/users`) and the app access (`app_access`), on the
  `auth` schema. It's built from `@dafne/backend-auth`,
  `@dafne/backend-users` and `@dafne/backend-database-auth`.
- **Only this app runs Better Auth** and writes the `auth` schema. The
  apps' APIs never add `AuthModule`; they only read `auth.user` (joins,
  foreign keys).
- The frontends **proxy `/api/auth/*`** to it (`next.config.ts`), so the
  session cookie (`dafne.session_token`) belongs to the frontend's origin.
  With `COOKIE_DOMAIN` (e.g. `cliente.it`) it belongs to the parent domain,
  and every app under it (`sales.cliente.it`, `reporting.cliente.it`) shares
  the sign-in.
- On startup it creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Verification emails are sent with Resend, in the user's language.

## App access

`app_access` says which user can use which app, and with which role:
the session carries it as `user.apps` (e.g. `{ sales: "admin" }`).

- A new user gets the apps in `DEFAULT_APPS` (e.g. `sales`).
- Global admins (`role: admin`) can use every app.

## Sessions in the apps' APIs: `@dafne/backend-session`

An app's API checks sessions without Better Auth:

```ts
// the app's root module
SessionModule.forRoot({ app: 'sales' }),
```

This registers a global `SessionGuard`. For each request it:

1. reads the cookie and asks `AUTH_URL/api/auth/get-session` (cached for 5
   seconds per cookie);
2. answers **401** without a session, **403** if the user can't use this app;
3. puts the session on the request.

If `apps/auth` is unreachable the answer is **503**, not "signed out".

Decorators, with the same shape as `@thallesp/nestjs-better-auth`'s:
`@Session()`, `@AllowAnonymous()`, `@OptionalAuth()`, `@Roles(['admin'])`
(the user's role in this app).

## Frontend ↔ backend: contracts

The frontend calls the APIs **from its server**, with `backendFetch` (the
app's API) and `authFetch` (`apps/auth`) from `@dafne/frontend-api/server`.
They forward the browser's cookies, the user's language
(`Accept-Language`) and `Origin: APP_URL` (Better Auth's CSRF check).

Both sides share **`@dafne/contracts`**, so they can't drift:

- request schemas (Zod) and response types, one file per resource;
- schemas hold **message keys** (`customers.name.required`), not texts.
  The texts are in `contracts/src/messages` (`en`, `it`);
- the backend validates with `ZodValidationPipe` and translates errors with
  `I18nExceptionFilter` (`@dafne/backend-common`, default locale `it`);
  the frontend translates the same keys.

## Better Auth options shared by both sides

`@dafne/auth-options` holds the options that don't depend on the database
or the environment (user fields such as `firstname`, `lastname`; the admin
plugin). The backend (`createAuth`) adds database, secret and URLs; the
frontend imports only the **type**, to infer the user's fields in the
client.

## Adding an app

A new app follows the same shape: its API with
`SessionModule.forRoot({ app: '<name>' })`, its own schema
(`<name>`), its frontend proxying `/api/auth`. `dafne g backend-app`
generates the API (see [CLI](cli.md#g-app)).

## See also

- [Databases and migrations](databases.md)
- [Project boundaries](boundaries.md)
- [Getting started](getting-started.md)
