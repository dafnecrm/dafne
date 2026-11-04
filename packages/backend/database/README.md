# @dafne/backend-database

The MySQL database, with [Drizzle](https://orm.drizzle.team) through
`@nestjs/drizzle`.

## Contents

- `DatabaseModule` (global): connects to `DATABASE_URL`, applies the
  pending migrations on startup (before anyone gets the database) and
  closes the pool on shutdown. Inject it with
  `@InjectDrizzle() private readonly db: Database`.
- `schema.ts`: `schema` (every table) and `relations`, built from
  `src/tables/*.ts` (`auth`, `customers`, `products`, `activities`,
  `countries`). `merge-relations.ts` lets a table add relations to
  another's.
- `MIGRATIONS`: the migrations live in the app that applies them
  (`apps/api/migrations`, table `_migrations`).

New tables come from the CLI (`pnpm dafne g resource <name>`), which adds
them to `schema.ts`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-database
pnpm nx lint @dafne/backend-database
pnpm nx typecheck @dafne/backend-database
```
