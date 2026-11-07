[← Index](README.md)

# The `dafne` CLI

`@dafne/cli` (`packages/cli`) is the `dafne` command. It does four things:

- **generates** backend and frontend code (resources and their parts,
  libs, apps, contracts), through this workspace's own Nx generators;
- **changes** resources: removes table columns and syncs the code that
  follows them (contract, service, specs, pages);
- runs the **database** migrations;
- gives **shortcuts** for Nx tasks.

## Running it

From the root, with no build (Node runs the TypeScript sources):

```sh
pnpm dafne <command>
pnpm dafne --help
pnpm dafne g --help
```

Arguments left out are asked interactively. With `-y` (`--yes`) the CLI
never prompts and fails instead, which suits scripts and CI.

## Generating: `dafne g`

```sh
dafne g <kind> <name> [options]
```

The kind is the name of the generator: `backend-*`, `frontend-*` or
`contract`.

| Kind                | What it creates                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| `backend-resource`  | contract + table + Nest lib with module, service, controller and specs |
| `backend-lib`       | an empty Nest lib, `@dafne/backend-<name>`                              |
| `backend-app`       | a NestJS app in `apps/<name>`                                           |
| `contract`          | a contract in `packages/contracts`                                     |
| `frontend-resource` | the pages of a resource: list, detail, form, actions, data, sidebar link |
| `frontend-list`     | its list page (and the parts it needs)                                 |
| `frontend-detail`   | its detail page                                                        |
| `frontend-form`     | its create/edit form and pages                                         |
| `frontend-actions`  | its server actions, form schema and delete dialog                      |
| `frontend-data`     | its API types, fetchers and table config (`lib/<plural>.ts`)           |
| `frontend-nav`      | its link in the sidebar                                                |
| `frontend-lib`      | an empty frontend lib, `@dafne/frontend-<name>`                         |
| `frontend-app`      | a Next.js app in `apps/<name>`                                          |

Common options:

| Option                | Meaning                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `--dry-run`           | show what would change, write nothing                             |
| `--force`             | overwrite files that already exist (otherwise creating one fails) |
| `-y`, `--yes`         | never prompt                                                      |
| `--app <name>`        | the app to generate into: `backend-lib`, `backend-resource` (default `sales-api`); `frontend-resource`, its parts and `frontend-lib` (default `sales-web`) |
| `--port <port>`       | `backend-app` (3001; `PORT` overrides it), `frontend-app` (4001)  |
| `--field <spec>`      | `backend-resource`: a field of the new table, repeatable          |
| `--icon <name>`       | `frontend-resource`, `frontend-list`, `frontend-nav`: a lucide-react icon (default `FileIcon`) |
| `--section <title>`   | `frontend-resource`, `frontend-nav`: the sidebar section (default `CRM`, created if missing) |
| `--admin`             | `frontend-resource`, `frontend-nav`: an admin-only section (default `Admin`) |
| `--backend-url <url>` | `frontend-app`: its API, `BACKEND_URL` (default `http://localhost:3000`) |

Names: a resource or contract can be singular or plural (`invoice`,
`invoices`, `invoiceItem`); a lib or app is used as given.

Nothing is written unless the whole generator succeeds. New files are
formatted with Prettier; edited files only if they were Prettier-clean
before. Wiring is idempotent: running again never registers twice.

### `g backend-resource`

```sh
dafne g backend-resource invoice
dafne g backend-resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field dueDate:date \
  --field customer:ref:to=customers
```

It creates, following the patterns of the `customers` resource:

- `packages/backend/<plural>/`: the lib `@dafne/backend-<plural>` (module,
  service, controller, specs), a workspace package;
- `packages/contracts/src/<plural>.ts` and its spec;
- `packages/backend/database/src/tables/<plural>.ts`.

And wires them: the lib into the app (`package.json`, app module, project
references), the table into `schema.ts`, the contract into the contracts'
index, the message keys into the catalogs.

Each resource starts with only a `serial` `id` (an `integer` the database
picks), soft delete (`deletedAt`) and created/updated by: no sample field.
Its pages name a record by its id: the title, the breadcrumb, the edit
page and the dialogs show `${t("invoices.singular")} ${invoice.id}`
("Invoice 12"), and the list's first column is the id, linking to the
detail page. Change them once a field names the record. Without
`--field`, the CLI asks for the fields one by one (an empty name ends the list). The fields go into the table; then the
contract, the service and the specs are synced with them.

#### Field specs

```
name:type[:option…]
```

| Part   | Values                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| Types  | `string`, `text`, `int`, `bigint`, `float`, `decimal`, `boolean`, `date`, `datetime`, `enum`, `json`, `ref` |
| Flags  | `required`, `unique`, `index`, `editor` (rich text, `text` only)                                           |
| Values | `length`, `values`, `default`, `precision`, `scale`, `api`, `to`, `relation`, `on-delete`, `inverse`        |

Lists use `|` (`values=draft|sent|paid`); `inverse=-` means no inverse
relation.

A `ref` adds a foreign key to the table in `to`:

| `relation`              | Column                          |
| ----------------------- | ------------------------------- |
| `many-to-one` (default) | `<name>Id` here, indexed        |
| `one-to-one`            | `<name>Id` here, unique         |
| `one-to-many`           | `<this>Id` on the other table   |
| `many-to-many`          | junction table `<this>_<other>` |

`on-delete`: `cascade`, `set null`, `restrict`, `no action` (default
`set null`, or `restrict` when `required`).

`api` controls where a column shows up in the contract:

| Tag                   | Effect                          |
| --------------------- | ------------------------------- |
| `internal`            | never in the contract           |
| `readonly`            | in responses only               |
| `writeonly`           | in the body only                |
| `detail`              | in the detail, not in the list  |
| `filter` / `nofilter` | force or prevent filtering      |
| `sort` / `nosort`     | force or prevent sorting        |

### `g backend-lib`

```sh
dafne g backend-lib reports              # @dafne/backend-reports, wired into sales-api
dafne g backend-lib jobs --app worker    # wired into apps/worker
```

An empty Nest lib in `packages/backend/<name>` (module, `index.ts`, vitest),
tagged `scope:backend` and registered in the app.

### `g backend-app`

```sh
dafne g backend-app worker --port 3002
```

A NestJS app in `apps/<name>`, set up like a minimal `apps/sales-api`:
rspack build, vitest, oxlint, Prettier, a root module and a controller.
Its `main.ts` migrates on startup with `MIGRATE_ON_START=true`.

### `g contract`

```sh
dafne g contract report              # packages/contracts/src/reports.ts + spec
```

### `g frontend-resource` and its parts

```sh
dafne g frontend-resource invoice --icon ReceiptIcon   # every part
dafne g frontend-resource invoice --app billing-web    # in another frontend app
dafne g frontend-detail invoice                        # one part
```

The pages of a resource in `apps/<app>` (default `sales-web`), following
the patterns of `customers`. Each part is a generator of its own:

| Part      | Files                                                                         | Needs                |
| --------- | ----------------------------------------------------------------------------- | -------------------- |
| `data`    | `lib/<plural>.ts` (API types, fetchers), `lib/<plural>-table.ts` (table config) | –                    |
| `actions` | `actions.ts`, `schema.ts` (form schema), `<singular>-dialogs.tsx`               | data                 |
| `list`    | `page.tsx`, `<plural>-table.tsx`, `<singular>-table-actions.tsx`                | data, actions        |
| `detail`  | `<singular>-detail.tsx` and its actions, `[id]/page.tsx`, `[id]/load-<singular>.ts` | data, actions    |
| `form`    | `<singular>-form.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`                     | data, actions, detail |
| `nav`     | a link in `lib/navigation.ts`                                                  | –                    |

Pages live in `app/[locale]/(app)/<plural>/`. A part also generates the
parts it needs, if they're missing. The list, detail and form are synced
with the contract (`packages/contracts/src/<plural>.ts`): they get its
fields, enum options included, so generate the backend first
(`g backend-resource`). The message keys go into the app's catalogs
(`messages/en.json`, `it.json`); Italian texts start in English.

### `g frontend-app`

```sh
dafne g frontend-app billing-web --port 4001 --backend-url http://localhost:3002
```

A Next.js app in `apps/<name>`, set up like `apps/sales-web` without its
resources: the frontend libs, next-intl (English and Italian), sign-in
through `apps/auth`, sidebar, account page and an empty dashboard. Tagged
`scope:frontend`. Its URL must be in `TRUSTED_ORIGINS` of `apps/auth`; its
pages come from `g frontend-resource … --app <name>`.

### `g frontend-lib`

```sh
dafne g frontend-lib charts                    # @dafne/frontend-charts
dafne g frontend-lib charts --app billing-web  # used by another frontend app
```

An empty lib in `packages/frontend/<name>`, set up like
`packages/frontend/auth`, tagged `scope:frontend`, and wired into the
frontend app (default `apps/sales-web`): dependency, `transpilePackages` in
`next.config.ts`, `nx.sync.ignoredDependencies`, root project reference.

### After generating

The generator prints the next steps. Usually:

```sh
pnpm install          # links the new package
pnpm nx sync          # TypeScript project references
pnpm dafne db generate   # after a new table: its migration
pnpm dafne typecheck @dafne/sales-web   # after new pages: also generates their route types
```

### Running the generators with Nx

Each kind is the Nx generator of `@dafne/cli` with the same name:

```sh
pnpm nx g @dafne/cli:backend-resource invoice --fields=number:string:required
pnpm nx g @dafne/cli:backend-lib reports
pnpm nx g @dafne/cli:backend-app worker
pnpm nx g @dafne/cli:contract report
pnpm nx g @dafne/cli:frontend-resource invoice --icon=ReceiptIcon
pnpm nx g @dafne/cli:frontend-list invoice --app=billing-web
pnpm nx g @dafne/cli:frontend-app billing-web
pnpm nx g @dafne/cli:frontend-lib charts
pnpm nx g @dafne/cli:remove-backend-db-column sales-orders --columns=name
pnpm nx g @dafne/cli:frontend-resource-sync sales-orders
pnpm nx list @dafne/cli
```

Don't use `@nx/nest`'s generators: they write a `project.json`, which this
workspace doesn't use.

## Changing a resource: `dafne remove`, `dafne sync`

```sh
dafne remove backend-db-column [table] [columns...]   # remove columns, sync the backend, generate the migration
dafne sync contract [resource]                        # bring the contract, service and specs in line with the table
dafne sync frontend-resource [resource]               # bring the pages in line with the contract
```

### `remove backend-db-column`

```sh
dafne remove backend-db-column                     # asks for the table and the columns (several)
dafne remove backend-db-column sales-orders name
dafne remove backend-db-column sales-orders name notes --no-migration
```

Removes the columns from the table file, with their indexes; a foreign key
(`customer` or `customerId`) takes its relations, a one-to-many removes the
key on the other table, a many-to-many its junction table. Then, for each
table that changed, it syncs the contract (body, query, sort and filter
fields, responses, enums only those columns used), the service (queries,
default sort) and the specs (samples, expected rows and failures, filter and
sort tests; a test only about a removed field goes). Message keys only the
removed columns used leave the contracts' catalogs.

Last, it asks whether to generate the migration (default yes;
`--migration` / `--no-migration` skip the question, `-y` means yes):
`dafne db generate --name drop-<table>-<columns>`. Never with `--dry-run`.

### `sync contract`

```sh
dafne sync contract                      # asks for the resource
dafne sync contract sales-orders
dafne sync contract --all --dry-run      # every table that has a contract
dafne sync contract sales-orders --no-service  # only the contract and its spec
```

Brings `packages/contracts/src/<plural>.ts` in line with
`packages/backend/database/src/tables/<plural>.ts`: the body schema, the
sort and filter fields, the list query and the response types (child
tables, e.g. customer addresses, too). New columns are added, columns gone
from the API are removed, hand-written validation and members that aren't
columns are kept (and listed). Then the service's queries (list select,
detail columns, insert, update) and the sample bodies of the specs.
`/** @api <tag> */` above a column decides where it goes: `internal`,
`readonly`, `writeonly`, `detail`, `filter`, `nofilter`, `sort`, `nosort`.
The `id` is always a filter, matched exactly (`?id=12`), unless tagged
`nofilter`; the other filters match text the field contains. With `--all`, a contract the sync can't read (e.g. `countries`, with no
body) is skipped. Then `dafne sync frontend-resource <resource>`.

### `sync frontend-resource`

```sh
dafne sync frontend-resource orders
dafne sync frontend-resource invoices --app billing-web --dry-run
dafne sync frontend-resource orders --keep   # only add, keep what the contract dropped
```

Brings the pages of a resource in `apps/<app>` (default `sales-web`) in line
with its contract: the form with the body, the list and the detail with the
responses. Fields the contract gained are added; those it dropped are
removed (inputs, defaults, columns, sort and filter fields, `<Detail>`s, enum
labels and the imports and message keys only they used), and a default sort
on a dropped field moves to `createdAt`. Where the pages still read a
dropped field (the title in `[id]/page.tsx`, the breadcrumb, the dialogs,
the row actions), the record's label takes its place,
`${t("orders.singular")} ${order.id}` ("Order 12"), and the field leaves
the `<Singular>Ref` type. With `--keep` those reads are only listed, as
`file:line`. Then `pnpm dafne typecheck @dafne/sales-web`.

The list's first column is the id, linking to the detail page, unless the
id's `@api` tags keep it out of the list (`detail`, `internal`): then there
is no id column (an existing one goes), and the sync warns that the row
links, actions and ids read it. A field that must stay off a page: `{/* dafne-ignore:
<field> */}`.

## Databases

```sh
dafne db create                          # the database and its owner (MIGRATIONS_DATABASE_URL), as ADMIN_DATABASE_URL
dafne db migrate                         # apply every schema's pending migrations
dafne db generate                        # a migration of @dafne/backend-database (the sales schema)
dafne db generate <package> --name x     # of another schema package
dafne db generate --custom --name x      # an empty migration, for SQL by hand
```

They run the targets of `@dafne/backend-migrator` and of the schema
packages. `migrate` needs `MIGRATIONS_DATABASE_URL`. See
[Databases and migrations](databases.md).

## Running tasks

```sh
dafne dev                            # @dafne/auth, @dafne/sales-api, @dafne/sales-web in watch mode
dafne dev @dafne/worker              # given projects
dafne test                           # every project
dafne test @dafne/backend-customers
dafne build | lint | typecheck [projects...]
dafne run test:e2e @dafne/sales-api    # any target
dafne affected                       # lint, typecheck, test, build of what changed
dafne affected test                  # only some targets
dafne projects                       # list the projects
dafne projects -t dev                # those with a target
```

They run `nx run-many` (or `nx affected`) with the terminal attached; Nx
adds the dependencies each target needs.

| Option            | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `--pick`          | choose the projects interactively, from those with the target |
| `--skip-nx-cache` | run even what is cached                                   |

## See also

- [Recipes](workflows.md)
- [Databases and migrations](databases.md)
- [Build system (Nx)](nx.md)
- [CI and contributing](contributing.md#changing-the-cli)
