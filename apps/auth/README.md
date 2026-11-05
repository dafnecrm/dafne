# @dafne/auth

The sign-in of every Dafne app: [Better Auth](https://www.better-auth.com)
(`/api/auth/*`), the users (`/users`) and the apps each user can use
(`app_access`), on the **`dafne_auth`** database.

```
browser ──► sales-web ──/api/auth/*──► apps/auth ──► dafne_auth
                    └─ data ───────► sales-api ──► dafne_sales (FK → dafne_auth.user)
                                       └─ session? ─► apps/auth
```

- The frontends proxy `/api/auth/*` here, so the session cookie
  (`dafne.session_token`) is theirs. With `COOKIE_DOMAIN` (e.g.
  `cliente.it`) it belongs to the parent domain, so the apps under it
  share the sign-in.
- The apps' APIs don't run Better Auth: `@dafne/backend-session` asks this
  service for the session of each cookie, with the user's apps
  (`user.apps`, e.g. `{ sales: "admin" }`).
- A new user gets the `DEFAULT_APPS`. Global admins (`role: admin`) can use
  every app.

## Run

```sh
cp .env.example .env          # then fill it in
pnpm dafne db migrate         # creates/migrates dafne_auth (and the others)
pnpm nx dev @dafne/auth       # http://localhost:3001; `pnpm dafne dev` starts it with the CRM
```

On startup it creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
`GET /` is a public health check.

## Built from

`@dafne/backend-auth` (Better Auth), `@dafne/backend-users` (users API),
`@dafne/backend-database-auth` (dafne_auth), `@dafne/backend-common`
(translated errors).

## Tasks

```sh
pnpm nx build @dafne/auth
pnpm nx test @dafne/auth
pnpm nx lint @dafne/auth
```
