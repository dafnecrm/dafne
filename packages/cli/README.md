# @dafne/cli

The `dafne` command: generates backend and frontend code (resources and
their parts, libs, apps, contracts) through Nx generators, runs the
database migrations and Nx tasks.

From the root: `pnpm dafne <command>` (no build needed). Arguments left out
are asked interactively; `-y` fails instead.

## Generating

```sh
dafne g backend-resource invoice         # contract + table + lib with service and controller
dafne g backend-lib reports              # empty Nest lib: @dafne/backend-reports
dafne g backend-lib jobs --app worker    # wire the lib into another app (default: sales-api)
dafne g backend-app worker --port 3002   # NestJS app in apps/worker
dafne g contract report                  # packages/contracts/src/reports.ts
dafne g frontend-resource invoice        # list, detail, form, actions, data and sidebar link
dafne g frontend-list invoice            # one part: list | detail | form | actions | data | nav
dafne g frontend-app billing-web         # Next.js app in apps/billing-web
dafne g frontend-lib charts              # @dafne/frontend-charts, used by apps/sales-web
```

The kind is the generator's name. Options: `--dry-run`, `--force`
(overwrite), `-y`; `--app` picks the app to generate into (a backend app
for `backend-*`, a frontend one for `frontend-*`); `--icon`, `--section`,
`--admin` set the sidebar link of a frontend resource.

`g backend-resource` asks for the fields of the new table (an empty name ends the
list), or takes them with `--field`, repeatable:

```sh
dafne g backend-resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field dueDate:date \
  --field customer:ref:to=customers
```

The spec is `name:type[:option…]`. Types: `string`, `text`, `int`, `bigint`,
`float`, `decimal`, `boolean`, `date`, `datetime`, `enum`, `json`, `ref`.
Flags: `required`, `unique`, `index`, `editor`. Values: `length`, `values`,
`default`, `precision`, `scale`, `api`, `to`, `relation`, `on-delete`,
`inverse` (`-` for none); lists use `|`.

The fields go into the table, then the contract, the service and their
specs are synced with them. A resource starts with only a `serial` `id`
(no sample field); its pages name a record "Invoice 12" and list it by id.

`g frontend-resource` (and each part) writes the pages in
`apps/<app>/app/[locale]/(app)/<plural>/`, synced with the contract's
fields, and adds their message keys to the app's catalogs. A part also
generates the parts it needs.

Each command runs a generator of this package, which can also be run with
Nx directly:

```sh
pnpm nx g @dafne/cli:backend-resource invoice --fields=number:string:required
pnpm nx g @dafne/cli:backend-lib reports
pnpm nx g @dafne/cli:backend-app worker
pnpm nx g @dafne/cli:contract report
pnpm nx g @dafne/cli:frontend-resource invoice
pnpm nx g @dafne/cli:frontend-app billing-web
pnpm nx g @dafne/cli:frontend-lib charts
pnpm nx list @dafne/cli
```

After generating: `pnpm install` (links new packages), `pnpm nx sync`
(project references), and for a table `pnpm dafne db generate`.
The generator prints these steps.

## Changing a resource

```sh
dafne remove backend-db-column orders name   # table, contract, service, specs, then the migration (asked, default yes)
dafne remove backend-db-column               # asks for the table and the columns
dafne sync contract orders                   # contract, service queries and specs follow the table (or --all)
dafne sync frontend-resource orders          # form, list and detail follow the contract: adds and removes fields
```

`sync contract` takes `--all`, `--no-service` (only the contract and its
spec) and `--dry-run`. It edits, it doesn't regenerate: hand-written
validation and members that aren't columns stay. `/** @api <tag> */`
above a column in the table decides where it goes (`internal`,
`readonly`, `writeonly`, `detail`, `filter`, `nofilter`, `sort`, `nosort`).
The `id` is always a filter (exact match), unless tagged `nofilter`.

`remove backend-db-column` takes `--no-migration` and `--dry-run`;
`sync frontend-resource` takes `--app`, `--keep` (only add) and
`--dry-run`. A dropped field the pages still read (the page title, a
dialog…) becomes the record's label, "Order 12" (with `--keep` it's only
listed). The id is the list's first column unless its `@api` tags keep it
out of the list.

## Databases

```sh
dafne db create                      # the database and its owner (MIGRATIONS_DATABASE_URL)
dafne db generate                    # a migration of @dafne/backend-database (the sales schema)
dafne db generate <package> --name x # of another schema package
dafne db migrate                     # apply every schema's migrations, in one order
```

They run the targets of `@dafne/backend-migrator` (see its README).

## Running tasks

```sh
dafne dev                            # @dafne/auth, @dafne/sales-api and @dafne/sales-web in watch mode
dafne dev @dafne/worker              # given projects
dafne test                           # every project; or dafne test @dafne/backend-customers
dafne build | lint | typecheck [projects...]
dafne run test:e2e @dafne/sales-api        # any target
dafne affected                       # lint, typecheck, test and build what changed
dafne projects -t dev                # list the projects (with a target)
```

They run `nx run-many` (with the dependencies Nx adds), with the terminal
attached. `--pick` chooses the projects from those with the target;
`--skip-nx-cache` reruns cached tasks.
