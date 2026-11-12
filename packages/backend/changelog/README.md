# @dafne/backend-changelog

The change log of CRUD resources: who changed what, and when, in
`changelog.change` (`@dafne/backend-database-changelog`).

A resource turns it on in its module, and this lib needs no edits:

```ts
imports: [
  ChangelogModule, // ChangelogService, to read the log
  ChangelogModule.forFeature<SalesOrderDetail>('sales-orders', {
    fields: ['notes', 'customerId', 'typeId', 'items'],
    map: { items: (items) => items.map(({ position, productId, quantity }) => ({ position, productId, quantity })) },
  }),
  FsmModule.forFeature({ …, imports: [ChangelogModule], post: [changelogTransitionHook('sales-orders')] }),
],
```

- `forFeature(resource, { fields, map? })` is a post write hook
  (`CrudHooksModule.forFeature`) on create, update and delete. It runs in
  the write's transaction and logs the `fields` that differ between
  `previous` and `result` (`{ from, to }`, as JSON). A create logs their
  first values, an update with no change logs nothing, and a delete logs
  no fields.
- `changelogTransitionHook(resource, field = 'status')` logs a state
  machine's status changes (`transition`). Give it as a hook of every
  transition, and keep the status out of `fields`.
- `ChangelogService.list(resource, id, { limit, offset })` returns a
  record's changes, newest first, with who made them (`ChangesList` of
  `@dafne/contracts`).

The table is partitioned by resource, and a new resource needs no
migration. See [docs/databases.md](../../../docs/databases.md#the-change-log).
