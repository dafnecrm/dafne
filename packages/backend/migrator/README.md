# @dafne/backend-migrator

Applies the migrations of **every** Dafne database (`dafne_crm`,
`dafne_auth`, …) in one order, and generates them.

## Why one migrator

Each database belongs to a package (`"dafne": { "database": "dafne_crm" }`
in its `package.json`, migrations in its `migrations/`), not to an app: a
shared database (`dafne_core`) may be used by several apps. The migrator
merges the migrations of all of them and applies them **by timestamp**,
whatever their database, so a fresh server replays the history as it
happened: e.g. `user` is created in `dafne_crm`, later moved to
`dafne_auth` with `RENAME TABLE`.

- Each migration runs in its database (`USE`), and is recorded in that
  database's `_migrations` (same table as drizzle's migrator, so older
  history counts).
- Missing databases are created.
- One run at a time (`GET_LOCK('dafne_migrations')`).

## Commands

```sh
pnpm dafne db migrate                  # apply
pnpm dafne db generate [package]       # drizzle-kit generate + foreign key fixes
pnpm dafne db move <from> <to>         # one time: move every table (RENAME TABLE)
```

- `migrate` needs `MIGRATIONS_DATABASE_URL`: a server URL
  (`mysql://user:pass@host:3306`) with a user that can create and alter
  the `dafne_*` databases. The apps use their own, limited users
  (`DATABASE_URL`). Set it in the environment or in this package's `.env`
  (ignored by git).
- `migrate:dev` (`dafne dev` runs it before the API) skips with a warning
  when `MIGRATIONS_DATABASE_URL` isn't set.
- In production, run `migrate` before deploying the apps.
- `generate` (a database package's `migration:generate`) runs drizzle-kit,
  then fixes the foreign keys of the new migrations from their
  `snapshot.json`: drizzle-kit 1.0.0-rc.5 drops `ON DELETE`/`ON UPDATE`
  inside `CREATE TABLE`, and writes keys to tables of other databases
  without the database name.

## Grants

The apps' MySQL users need, besides their own database, `SELECT` and
`REFERENCES` on the tables of other databases they point to (e.g.
`dafne_auth.user`). The operator sets them up.

## Tasks

```sh
pnpm nx test @dafne/backend-migrator   # MIGRATOR_TEST_URL=mysql://… also runs the MySQL test
pnpm nx lint @dafne/backend-migrator
pnpm nx typecheck @dafne/backend-migrator
```
