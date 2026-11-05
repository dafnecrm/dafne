[← Index](README.md)

# Recipes

Step-by-step guides for the most common changes. All commands run from the
root.

## Add a backend resource

E.g. invoices, in the sales API.

```sh
pnpm dafne g resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field customer:ref:to=customers
pnpm install                          # links @dafne/backend-invoices
pnpm nx sync                          # project references
pnpm dafne db generate --name add-invoice
pnpm dafne db migrate
pnpm dafne test @dafne/backend-invoices
```

Then replace or remove the sample `name` field, and adjust the service and
controller to the real use cases. Try it first with `--dry-run`.

## Add a backend lib

A lib with no table (e.g. a reporting service):

```sh
pnpm dafne g lib reports              # wired into apps/sales-api
pnpm dafne g lib reports --app worker # or into another app
pnpm install && pnpm nx sync
```

If the lib uses npm packages at runtime, add them to the app's
`package.json` too (see [Build system](nx.md#packages-that-ship-sources)).

## Add a backend app

```sh
pnpm dafne g app worker --port 3002
pnpm install && pnpm nx sync
pnpm dafne dev @dafne/worker
```

Then:

- give it its env (`apps/worker/.env`);
- add libs with `pnpm dafne g lib <name> --app worker` or
  `pnpm dafne g resource <name> --app worker`;
- if it needs signed-in users, add `SessionModule.forRoot({ app: 'worker' })`
  to its root module (see [Architecture](architecture.md#sessions-in-the-apps-apis-dafnebackend-session));
- if it needs its own tables, they go in its own database, `dafne_worker`
  (see [Databases](databases.md#one-database-per-app)).

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

Import it from `apps/sales-web` as `@dafne/frontend-charts`. Remember the
boundaries: a frontend lib may import only frontend and shared packages.

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
