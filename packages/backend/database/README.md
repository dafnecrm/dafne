# @dafne/backend-database

The sales app's **`sales`** schema, in the Postgres database, with
[Drizzle](https://orm.drizzle.team) through `@nestjs/drizzle`.

## Contents

- `DatabaseModule` (global): connects to `DATABASE_URL` (the app's role,
  on the `dafne` database). Inject it with
  `@InjectDrizzle() private readonly db: Database`. It doesn't migrate: the migrator does (`pnpm dafne db migrate`, or the
  apps on startup with `MIGRATE_ON_START=true`).
- `src/tables/*.ts`: the tables, declared in the schema
  (`salesSchema.table`, from `src/tables/sales.ts`).
- `src/auth.ts`: re-exports the users' table (`auth.user`) the sales tables
  point to. It's outside `tables/` on purpose: drizzle-kit writes every
  table its schema files export into this package's migrations.
- `schema.ts`: `schema` (every table) and `relations`, built from
  `src/tables/*.ts`. `merge-relations.ts` lets a table add relations to
  another's.
- `migrations/`: the migrations of the sales schema (drizzle-kit, one
  folder per migration). The package declares its schema in
  `package.json` (`"dafne": { "schema": "sales" }`), so
  `@dafne/backend-migrator` finds them.

## Migrations

```sh
pnpm dafne db generate                 # from the table changes (drizzle.config.ts)
pnpm dafne db generate --custom --name backfill-x   # empty, SQL by hand
pnpm dafne db migrate                  # apply (every schema)
```

New tables come from the CLI (`pnpm dafne g backend-resource <name>`), which adds
them to `schema.ts`.

## Schemas of the apps

One schema per app (`sales`, …), plus `auth` and, once a second app needs
a table, `core`. A table moves to core when another app must read it or
reference it, with `ALTER TABLE … SET SCHEMA core` (rows, indexes and
foreign keys move with it). Dependencies go one way: app → core → auth.
See `docs/databases.md`.

## Tasks

```sh
pnpm nx test @dafne/backend-database
pnpm nx lint @dafne/backend-database
pnpm nx typecheck @dafne/backend-database
```
