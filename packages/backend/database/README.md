# @dafne/backend-database

The CRM's MySQL database, **`dafne_crm`**, with
[Drizzle](https://orm.drizzle.team) through `@nestjs/drizzle`.

## Contents

- `DatabaseModule` (global): connects to `DATABASE_URL` (the app's user,
  on `dafne_crm`). Inject it with
  `@InjectDrizzle() private readonly db: Database`. It doesn't migrate: the migrator does (`pnpm dafne db migrate`, or the
  apps on startup with `MIGRATE_ON_START=true`).
- `schema.ts`: `schema` (every table) and `relations`, built from
  `src/tables/*.ts`. `merge-relations.ts` lets a table add relations to
  another's.
- `migrations/`: the migrations of `dafne_crm` (drizzle-kit, one folder per
  migration). The package declares its database in `package.json`
  (`"dafne": { "database": "dafne_crm" }`), so `@dafne/backend-migrator`
  finds them.

## Migrations

```sh
pnpm dafne db generate                 # from the table changes (drizzle.config.ts)
pnpm dafne db generate --custom --name backfill-x   # empty, SQL by hand
pnpm dafne db migrate                  # apply (every database)
```

New tables come from the CLI (`pnpm dafne g resource <name>`), which adds
them to `schema.ts`.

## Databases of the apps

One database per app (`dafne_crm`, …), plus `dafne_auth` and, once a
second app needs a table, `dafne_core`. A table moves to core when
another app must read it or reference it, with `RENAME TABLE` (same
server: rows, indexes and foreign keys move with it). Dependencies go one
way: app → core → auth. See the root `CLAUDE.md`.

## Moving the old `dafne` database

Environments created before the split have everything in `dafne`. Once:

```sh
pnpm dafne db move dafne dafne_crm     # RENAME TABLE of every table, _migrations included
```

then point `DATABASE_URL` at `dafne_crm` and run `pnpm dafne db migrate`
(nothing to apply).

## Tasks

```sh
pnpm nx test @dafne/backend-database
pnpm nx lint @dafne/backend-database
pnpm nx typecheck @dafne/backend-database
```
