[← Index](README.md)

# Getting started

## Prerequisites

- **Node.js ≥ 26** (`engines` in the root `package.json`). The CLI runs its
  TypeScript sources directly, through Node's type stripping.
- **pnpm 9.15.2** (`packageManager` in the root `package.json`; `corepack
  enable` picks it up).
- **MySQL**: one server holds every `dafne_*` database.
- **Redis** (optional): the API's cache. Without `REDIS_URL` the cache is in
  memory.

## Install

From the root, once for every project (there is a single `pnpm-lock.yaml`):

```sh
pnpm install
```

## Environment files

Each app reads its own `.env` (ignored by git), with a `.env.example` to
copy:

| File                                 | Main variables                                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/auth/.env`                     | `PORT` (3001), `DATABASE_URL` (on `dafne_auth`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, `COOKIE_DOMAIN`, `DEFAULT_APPS`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `RESEND_API_KEY` |
| `apps/sales-api/.env`                  | `PORT` (3000), `DATABASE_URL` (on `dafne_sales`), `AUTH_URL`, `REDIS_URL`                                                                                                             |
| `apps/sales-web/.env`                  | `BACKEND_URL`, `AUTH_URL`, `APP_URL` (4000)                                                                                                                                        |
| `packages/backend/migrator/.env`     | `MIGRATIONS_DATABASE_URL`: the MySQL server, with a user that can create and alter the `dafne_*` databases (no database in the URL)                                               |

The apps connect with their own, limited MySQL users (`DATABASE_URL`). Only
the migrator uses the privileged one. See
[Databases and migrations](databases.md) for the grants the apps' users need.

The backend apps also have `MIGRATE_ON_START` / `MIGRATIONS_DATABASE_URL`:
leave them off in development, where `dafne dev` migrates first.

## First run

```sh
pnpm dafne db migrate     # creates the missing databases and applies every migration
pnpm dafne dev            # starts @dafne/auth, @dafne/sales-api, @dafne/sales-web
```

| App              | URL                     |
| ---------------- | ----------------------- |
| `@dafne/sales-web` | <http://localhost:4000> |
| `@dafne/sales-api` | <http://localhost:3000> |
| `@dafne/auth`    | <http://localhost:3001> |

On startup `apps/auth` creates the admin user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`: sign in with it on the frontend.

`dafne dev` runs the migrations before the APIs (`migrate:dev`), and skips
them with a warning when `MIGRATIONS_DATABASE_URL` isn't set.

## Everyday commands

```sh
pnpm build | test | lint | typecheck    # every project
pnpm affected                           # only what changed (as CI does)
pnpm nx test @dafne/sales-api             # one target of one project
pnpm dafne test @dafne/backend-customers
pnpm graph                              # the Nx project graph in the browser
```

## See also

- [The `dafne` CLI](cli.md)
- [Monorepo structure](structure.md)
- [Databases and migrations](databases.md)
