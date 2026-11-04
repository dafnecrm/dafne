# @dafne/backend-database-auth

**`dafne_auth`**: Better Auth's tables (`user`, `session`, `account`,
`verification`) and `app_access` (which apps a user can use, with which
role), with their migrations.

## Tables in their schema

Every table is defined in `mysqlSchema('dafne_auth')`, so every query names
the database (`dafne_auth`.`user`). That's what lets the apps, connected to
their own database, point to the users with foreign keys and join them
(e.g. `customer.createdBy`). drizzle-kit ignores tables in a `mysqlSchema`,
so they are written twice from one source:

- `src/kit/*.ts`: plain `mysqlTable`s, for drizzle-kit. The Better Auth
  CLI writes `src/kit/better-auth.ts`
  (`pnpm --filter @dafne/backend-auth auth:schema:generate`).
- `src/better-auth.ts`, `src/app-access.ts`: generated from them by
  `pnpm --filter @dafne/backend-database-auth tables:qualify`; a test fails
  when they're out of date. Don't edit them.

## Contents

- `user`, `session`, `account`, `verification`, `appAccess`,
  `authSchema`, `authDatabaseRelations`, `AuthDatabase`.
- `AuthDatabaseModule`: the connection (`DATABASE_URL`), for `apps/auth`
  only.

## Migrations

```sh
pnpm dafne db generate @dafne/backend-database-auth   # from src/kit
pnpm dafne db migrate
```

The first one moves Better Auth's tables from `dafne_crm` (where the CRM
created them) with `RENAME TABLE`, creates `app_access` and gives the
existing users the `crm` app.

## Tasks

```sh
pnpm nx test @dafne/backend-database-auth
pnpm nx lint @dafne/backend-database-auth
pnpm nx typecheck @dafne/backend-database-auth
```
