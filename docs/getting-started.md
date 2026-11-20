[← Index](README.md)

# Getting started

## Prerequisites

- **Node.js ≥ 26** (`engines` in the root `package.json`). The CLI runs its
  TypeScript sources directly, through Node's type stripping.
- **pnpm 12.16.1** (`packageManager` in the root `package.json`). pnpm 12
  switches to it on its own; from an older pnpm, install it with `npx
  pnpm@12.16.1 self-update`. Dependencies allowed to run install scripts are
  listed in `allowBuilds` (`pnpm-workspace.yaml`): `pnpm install` fails on a
  new one until `pnpm approve-builds` adds it.
- **PostgreSQL** (≥ 15; 18 in development): one database, `dafne`, with a
  schema per app (`auth`, `sales`, …). `pnpm dafne db create` creates it
  (see First run).
- **Redis** (optional): the API's cache. Without `REDIS_URL` the cache is in
  memory.
- **[Gotenberg](https://gotenberg.dev)** (8): converts the documents filled
  from the uploaded Word templates to PDF (`GOTENBERG_URL`). Only the PDF
  downloads need it.

For development, `compose.yaml` runs all three (Docker, or
[OrbStack](https://orbstack.dev) on macOS, which uses less memory than
Docker Desktop), and **`pnpm dafne dev` starts them by itself** before the
apps. They keep running after it stops, with the data in volumes:

```sh
pnpm dafne services up       # start them without the apps
pnpm dafne services status   # ports and health
pnpm dafne services down     # stop them (-v: and delete the data)
```

Without Docker, or with a port another server holds, `dafne dev` starts
nothing and the apps use what their `.env` points to; `--no-services`
skips them.

They answer at `db.dafne.localhost:5432` (superuser `postgres` / `secret`),
`redis.dafne.localhost:6379` and `gotenberg.dafne.localhost:3100` (which
converts documents to PDF), the hosts of the `.env.example` files.
`*.localhost` resolves to this machine by itself, and the ports are
published on the loopback only. Another PostgreSQL (e.g. Postgres.app) or
Redis on those ports must be stopped first, or the containers moved:
`DAFNE_DB_PORT=5433 DAFNE_REDIS_PORT=6380 docker compose up -d`, with the
same ports in the URLs. A local server works too: `db.dafne.localhost`
reaches it as well.

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
| `apps/auth/.env`                     | `PORT` (3001), `DATABASE_URL` (on `dafne`), `BETTER_AUTH_SECRET`, `AUTH_ALLOWED_HOSTS`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, `COOKIE_DOMAIN`, `DEFAULT_APPS`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `RESEND_API_KEY` |
| `apps/sales-api/.env`                  | `PORT` (3000), `DATABASE_URL` (on `dafne`), `AUTH_URL`, `REDIS_URL`                                                                                                             |
| `apps/sales-web/.env`                  | `BACKEND_URL`, `AUTH_URL`, `APP_URL` (`https://sales-web.dafne.localhost`)                                                                                                          |
| `packages/backend/migrator/.env`     | `MIGRATIONS_DATABASE_URL`: the `dafne` database, with the user that owns it; `ADMIN_DATABASE_URL`: a superuser, to create the database (`db create`, and `dafne dev` when it's missing)                                               |

In development every URL uses the same `dafne` user, the database's
owner, which `pnpm dafne db create` makes. In production the apps connect
with their own, limited roles (`DATABASE_URL`), and only the migrator uses
the owner: see [Databases and migrations](databases.md#roles-and-grants)
for those roles and their grants.

The backend apps also have `MIGRATE_ON_START` / `MIGRATIONS_DATABASE_URL`:
leave them off in development, where `dafne dev` migrates first.

## First run

```sh
pnpm dafne dev            # PostgreSQL and Redis, the database, the migrations, then the apps
```

On the first run `dafne dev` starts the services of `compose.yaml`,
creates the `dafne` database and its owner (from
`MIGRATIONS_DATABASE_URL`, as the superuser of `ADMIN_DATABASE_URL`),
applies every migration, then starts `@dafne/auth`, `@dafne/sales-api` and
`@dafne/sales-web`. The same steps one by one, e.g. on your own server:

```sh
pnpm dafne services up    # PostgreSQL and Redis (or your own server)
pnpm dafne db create      # the dafne database and user (from MIGRATIONS_DATABASE_URL), as ADMIN_DATABASE_URL
pnpm dafne db migrate     # creates the schemas and applies every migration
```

| App                | URL                                | Port |
| ------------------ | ---------------------------------- | ---- |
| `@dafne/sales-web` | <https://sales-web.dafne.localhost> | 4000 |
| `@dafne/sales-api` | <https://sales-api.dafne.localhost> | 3000 |
| `@dafne/auth`      | <https://auth.dafne.localhost>      | 3001 |

`dafne dev` serves each app at `https://<app>.dafne.localhost` through a
small proxy of its own, on port 443 (port 80 redirects there).
`*.localhost` resolves to this machine by itself: no hosts file. The
certificate comes from [mkcert](https://github.com/FiloSottile/mkcert)
(`brew install mkcert`, then `mkcert -install` once); without it the
proxy serves `http://` on port 80. <https://dafne.localhost> lists the
running apps. The apps still answer on
`localhost:<port>` too (see [CLI](cli.md#the-dev-proxy)). The session
cookie belongs to `dafne.localhost` (`COOKIE_DOMAIN`), so every app shares
the sign-in, and sign-in works on the `*.dafne.localhost` URLs, not on
`localhost:4000`.

On startup `apps/auth` creates the admin user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`: sign in with it on the frontend. To set up the AI
assistant, put your email in `SUPER_ADMIN_EMAILS` (apps/auth) and see
[the AI assistant](assistant.md).

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
