# @dafne/backend-database-changelog

The `changelog` schema: the change log of the CRUD resources, written only
through `@dafne/backend-changelog`.

One table, `changelog.change`, **partitioned by resource**
(`PARTITION BY LIST (resource)`):

- `change_default` (DEFAULT) takes the resources without a partition of
  their own: a new resource needs no migration;
- `change_sales_orders` takes `sales-orders`.

A resource that grows big gets its own partition with a migration (recipe
in [docs/databases.md](../../../docs/databases.md#the-change-log)).

drizzle-kit can't create partitioned tables, so `src/change.ts` defines the
table **for queries only** (drizzle-kit doesn't see it) and every migration
of this package is written by hand:

```sh
pnpm dafne db generate @dafne/backend-database-changelog --custom --name <name>
```

Keep `src/change.ts` and the migrations in line.
