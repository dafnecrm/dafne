# @dafne/backend-database-auth

The **`auth`** schema: Better Auth's tables (`user`, `session`, `account`,
`verification`) and `app_access` (which apps a user can use, with which
role), with their migrations.

## Tables in their schema

Every table is declared in `pgSchema('auth')` (`authDb.table`), so every
query names the schema (`"auth"."user"`), and the apps' tables point to the
users with foreign keys and join them (e.g. `customer.createdBy`).

- `src/better-auth.ts`: written by the Better Auth CLI, then moved into the
  schema by `tables:schema` (`pgTable` → `authDb.table`, timestamps with
  time zone; `src/into-schema.ts`). Regenerate both with
  `pnpm --filter @dafne/backend-auth auth:schema:generate`; a test fails
  when the file didn't go through `tables:schema`. Don't edit it.
- `src/app-access.ts`: Dafne's own table, by hand.

## Contents

- `user`, `session`, `account`, `verification`, `appAccess`,
  `authSchema`, `authDatabaseRelations`, `AuthDatabase`, `AUTH_SCHEMA`,
  `authDb`.
- `AuthDatabaseModule`: the connection (`DATABASE_URL`), for `apps/auth`
  only.

## Migrations

```sh
pnpm dafne db generate @dafne/backend-database-auth
pnpm dafne db migrate
```

## Tasks

```sh
pnpm nx test @dafne/backend-database-auth
pnpm nx lint @dafne/backend-database-auth
pnpm nx typecheck @dafne/backend-database-auth
```
