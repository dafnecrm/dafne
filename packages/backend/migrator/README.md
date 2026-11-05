# @dafne/backend-migrator

Creates the Dafne Postgres database, applies the migrations of **every**
schema (`auth`, `sales`, …) in one order, and generates them.

## Why one migrator

Each schema belongs to a package (`"dafne": { "schema": "sales" }` in its
`package.json`, migrations in its `migrations/`), not to an app: a shared
schema (`core`) may be used by several apps. The migrator merges the
migrations of all of them and applies them **by timestamp**, whatever their
schema, so a fresh database replays the history as it happened: e.g. a
table created in `sales`, later moved to `core` with `ALTER TABLE … SET
SCHEMA`.

- Each migration runs in a transaction, with `search_path` set to its
  schema, and is recorded in `public._migrations` (schema, name, hash) in
  the same transaction: a failing migration is rolled back whole.
- A schema's first migration creates it (drizzle-kit writes `CREATE
  SCHEMA`).
- One run at a time (`pg_advisory_lock`).

## Commands

```sh
pnpm dafne db create                   # the database and its owner
pnpm dafne db migrate                  # apply
pnpm dafne db generate [package]       # drizzle-kit generate
```

- `create` reads the database, its owner and the owner's password from
  `MIGRATIONS_DATABASE_URL` (`postgres://dafne:secret@host:5432/dafne`), and
  creates them as the superuser of `ADMIN_DATABASE_URL` (or `--admin-url`):
  the role with `LOGIN` and that password, the database `UTF8`, ICU
  collation (`--icu-locale`, default `und`; `--locale`, default `C.UTF-8`),
  from `template0`, owned by the role. What exists is left alone (an
  existing role keeps its password); for an existing database it warns
  when encoding, collation or owner differ. The apps' own roles are the
  operator's (see `docs/databases.md`).

- `migrate` needs `MIGRATIONS_DATABASE_URL`: the database URL
  (`postgres://user:pass@host:5432/dafne`) with a user that can create and
  alter its schemas. The apps use their own, limited roles
  (`DATABASE_URL`). Set it in the environment or in this package's `.env`
  (ignored by git).
- `migrate:dev` (`dafne dev` runs it before the API) skips with a warning
  when `MIGRATIONS_DATABASE_URL` isn't set.
- In production, either the apps migrate on startup (below), or a deploy
  step runs `migrate` before the apps are updated.
- `generate` (a schema package's `migration:generate`) runs drizzle-kit
  with the package's `drizzle.config.ts`, nothing else.

## Migrations on startup

An app built from `dafne g backend-app` (and `sales-api`, `auth`) can apply the
migrations itself when it starts, before Nest:

```ts
// src/main.ts
await migrateOnStart({
  migrations: join(import.meta.dirname, 'migrations'),
  log: (line) => logger.log(line),
});
```

- It only runs with `MIGRATE_ON_START=true`, and then needs
  `MIGRATIONS_DATABASE_URL` (environment or the app's `.env`).
  Otherwise it does nothing: in development `dafne dev` migrates first.
- The app's `rspack.config.js` copies the `migration.sql` of **every**
  schema package into `dist/migrations/<schema>/`
  (`migrationCopyPatterns` from `@dafne/backend-migrator/bundle`). Every
  schema's, not just the app's: they run in one order across schemas
  (sales points to auth, and later to core), so any app can bring a fresh
  database up to date. The apps' `build` lists the
  migrations among its Nx inputs.
- Apps or replicas that start together are safe: one takes the lock and
  migrates, the others wait, then find nothing to apply. A failing
  migration throws, so the app doesn't start on a half-migrated database.
- The trade-off: the app's environment holds a user with DDL rights, and
  a restart may migrate other apps' schemas. When that's not wanted,
  leave `MIGRATE_ON_START` off and run `migrate` as a deploy step (e.g. a
  GitHub Actions job before the deploy: `pnpm install` then
  `pnpm nx run @dafne/backend-migrator:migrate` with
  `MIGRATIONS_DATABASE_URL` from the secrets).
- Either way, a migration must keep working with the version of the apps
  still running (add first, drop in a later release).

## Grants

The apps' roles need, besides their own schema, `USAGE` on the schemas
they point to and `SELECT`, `REFERENCES` on those tables (e.g.
`auth.user`). The operator sets them up (see `docs/databases.md`).

## Tasks

```sh
pnpm nx test @dafne/backend-migrator   # MIGRATOR_TEST_URL / MIGRATOR_TEST_ADMIN_URL=postgres://… also run the Postgres tests
pnpm nx lint @dafne/backend-migrator
pnpm nx typecheck @dafne/backend-migrator
```
