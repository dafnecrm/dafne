[← Index](README.md)

# Recipes

Step-by-step guides for the most common changes. All commands run from the
root.

## Add a backend resource

E.g. invoices, in the sales API.

```sh
pnpm dafne g backend-resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field customer:ref:to=customers
pnpm install                          # links @dafne/backend-invoices
pnpm nx sync                          # project references
pnpm dafne db generate --name add-invoice
pnpm dafne db migrate
pnpm dafne test @dafne/backend-invoices
```

The table has only a `serial` `id` besides the given fields: the pages
name a record "Invoice 12" (title, breadcrumb, dialogs) and the list links
to it from the id column, until you pick a field for them. Then adjust the service and controller to the real use cases.
Try it first with `--dry-run`.

## Add the pages of a resource

Once its contract exists (e.g. after `g backend-resource invoice`):

```sh
pnpm dafne g frontend-resource invoice --icon ReceiptIcon
pnpm dafne typecheck @dafne/sales-web   # also generates the new routes' types
```

List, detail and form pages, server actions, `lib/invoices.ts` and the
sidebar link, with the contract's fields. Translate the new Italian texts
in `apps/sales-web/messages/it.json`. One part at a time:
`g frontend-list | frontend-detail | frontend-form | frontend-actions |
frontend-data | frontend-nav invoice`; `--app <name>` targets another
frontend app.

## Remove columns from a resource

E.g. `notes` from sales orders:

```sh
pnpm dafne remove backend-db-column sales-orders notes   # or with no arguments: asks for the table and the columns
pnpm dafne test @dafne/backend-sales-orders @dafne/contracts
pnpm dafne sync frontend-resource sales-orders           # the pages
pnpm dafne typecheck @dafne/sales-web
pnpm dafne db migrate
```

The first command removes the columns from the table (with their indexes
and relations), syncs the contract, the service and their specs, drops the
message keys only those columns used, then generates the migration
(`drop-order-notes`; it asks first, default yes, `--no-migration` skips it).
The sync removes the inputs, columns, filters and details of the dropped
fields; where the pages read one elsewhere (a page title, a dialog), it
puts the record's label instead ("Order 12"). Check the migration's SQL before
applying it: dropping a column deletes its data.

## Sync the contract with the table

After editing a table file by hand (a column added, an `@api` tag changed):

```sh
pnpm dafne sync contract invoices            # contract, service queries, specs
pnpm dafne sync contract --all --dry-run     # shows what would change everywhere
pnpm dafne test @dafne/backend-invoices @dafne/contracts
pnpm dafne db generate --name add-invoice-notes
```

## Sync the pages with the contract

After a contract changes (columns added to the table and synced, or
removed):

```sh
pnpm dafne sync frontend-resource invoices            # adds the new fields, removes the dropped ones
pnpm dafne sync frontend-resource invoices --keep     # only adds
pnpm dafne sync frontend-resource invoices --dry-run  # shows what would change
```

New inputs, columns and details go at the end of their section, with
English labels in the catalogs: move them where they belong and translate
the Italian texts.

## Add a backend lib

A lib with no table (e.g. a reporting service):

```sh
pnpm dafne g backend-lib reports              # wired into apps/sales-api
pnpm dafne g backend-lib reports --app worker # or into another app
pnpm install && pnpm nx sync
```

If the lib uses npm packages at runtime, add them to the app's
`package.json` too (see [Build system](nx.md#packages-that-ship-sources)).

## Add a backend app

```sh
pnpm dafne g backend-app worker --port 3002
pnpm install && pnpm nx sync
pnpm dafne dev @dafne/worker
```

Then:

- give it its env (`apps/worker/.env`);
- add libs with `pnpm dafne g backend-lib <name> --app worker` or
  `pnpm dafne g backend-resource <name> --app worker`;
- if it needs signed-in users, add `SessionModule.forRoot({ app: 'worker' })`
  to its root module (see [Architecture](architecture.md#sessions-in-the-apps-apis-dafnebackend-session));
- if it needs its own tables, they go in its own schema, `worker`
  (see [Databases](databases.md#one-schema-per-app)).

## Add a contract

A contract without a backend resource:

```sh
pnpm dafne g contract report
pnpm nx test @dafne/contracts
```

A pull request that touches `packages/contracts` needs both the backend and
the frontend owners.

## Add a frontend lib

```sh
pnpm dafne g frontend-lib charts
pnpm install && pnpm nx sync
pnpm dafne typecheck @dafne/frontend-charts @dafne/sales-web
```

Import it from `apps/sales-web` as `@dafne/frontend-charts` (`--app <name>`
wires it into another frontend app). Remember the boundaries: a frontend
lib may import only frontend and shared packages.

## Add a frontend app

```sh
pnpm dafne g frontend-app billing-web --port 4001 --backend-url http://localhost:3002
pnpm install && pnpm nx sync
cp apps/billing-web/.env.example apps/billing-web/.env
pnpm dafne dev @dafne/auth @dafne/billing-web   # plus its API
```

A Next.js app like `apps/sales-web`, without its resources. Add
`http://localhost:4001` to `TRUSTED_ORIGINS` of `apps/auth`, then its pages
with `pnpm dafne g frontend-resource <name> --app billing-web`.

## Add a shadcn component

Components live in `@dafne/frontend-ui`:

```sh
pnpm --filter @dafne/frontend-ui shadcn:add <name>
```

Import it as `@dafne/frontend-ui/components/<name>`.

## Add a migration by hand

For SQL the tables can't express (data fixes, backfills):

```sh
pnpm dafne db generate --custom --name backfill-countries
# write the SQL in the new migration.sql, one `--> statement-breakpoint` between statements
pnpm dafne db migrate
```

## Add an npm dependency

- Used by **one** project: add it to that project, e.g.
  `pnpm --filter @dafne/backend-invoices add some-lib`.
- Used by **several** projects: add the version to the `catalog:` of
  `pnpm-workspace.yaml`, then reference it as `"some-lib": "catalog:"` in
  each `package.json`, and run `pnpm install`.
- A runtime dependency of a backend lib goes in the app too.

## Before opening a pull request

```sh
pnpm nx sync:check
pnpm boundaries
pnpm affected
```

That's what CI runs (see [CI and contributing](contributing.md)).

## See also

- [The `dafne` CLI](cli.md)
- [Databases and migrations](databases.md)
- [Project boundaries](boundaries.md)
